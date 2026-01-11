#!/usr/bin/env python3
"""
Fast Check Skill - Groq/Llama 3 を使用した高速NGワード検出

約0.5秒でテキスト内の問題のある表現を抽出します。
"""

import json
import os
import sys
import time
import warnings
from dataclasses import dataclass
from typing import List, Literal

# Suppress warnings to stderr
warnings.filterwarnings("ignore")

from groq import Groq

# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


@dataclass
class NGWord:
    word: str
    position: int
    severity: Literal["high", "medium", "low"]
    reason: str


@dataclass
class FastCheckResult:
    ng_words: List[NGWord]
    processing_time_ms: int


SYSTEM_PROMPT = """You are a fast NG word detector. Analyze the text and identify potentially problematic words or phrases.
Output JSON only with this structure:
{
  "ngWords": [
    {
      "word": "string",
      "position": number,
      "severity": "high" | "medium" | "low",
      "reason": "string"
    }
  ]
}

Focus on:
- Discriminatory language (差別的表現)
- Defamatory statements (名誉毀損)
- Privacy violations (プライバシー侵害)
- Threatening content (脅迫・恐喝)
- Inappropriate content (不適切なコンテンツ)
- Legal risks (法的リスク)

Be fast and accurate. Output ONLY valid JSON.
Respond in Japanese for the reason field."""


def run_fast_check(text: str) -> FastCheckResult:
    """
    テキストを高速でスキャンし、NGワードを検出する

    Args:
        text: 検査対象のテキスト

    Returns:
        FastCheckResult: 検出結果と処理時間
    """
    start_time = time.time()

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        processing_time_ms = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content or "{}"

        parsed = json.loads(content)
        ng_words = [
            NGWord(
                word=item.get("word", ""),
                position=item.get("position", 0),
                severity=item.get("severity", "low"),
                reason=item.get("reason", ""),
            )
            for item in parsed.get("ngWords", [])
        ]

        return FastCheckResult(ng_words=ng_words, processing_time_ms=processing_time_ms)

    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        print(f"Error in fast_check: {e}", file=sys.stderr)
        return FastCheckResult(ng_words=[], processing_time_ms=processing_time_ms)


def main():
    """CLI entry point for testing"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python fast_check.py <text>")
        sys.exit(1)

    text = " ".join(sys.argv[1:])
    result = run_fast_check(text)

    output = {
        "ngWords": [
            {
                "word": w.word,
                "position": w.position,
                "severity": w.severity,
                "reason": w.reason,
            }
            for w in result.ng_words
        ],
        "processingTimeMs": result.processing_time_ms,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
