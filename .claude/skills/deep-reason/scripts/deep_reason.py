#!/usr/bin/env python3
"""
Deep Reason Skill - Claude を使用した詳細な法的判定

文脈を理解し、法的観点から問題点を分析、修正案を生成します。
"""

import json
import os
import re
import sys
import warnings
from dataclasses import dataclass, asdict
from typing import List, Optional, Literal

# Suppress warnings to stderr
warnings.filterwarnings("ignore")

import anthropic

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


@dataclass
class Issue:
    type: str
    description: str
    location: str
    suggested_fix: str


@dataclass
class LegalJudgment:
    is_compliant: bool
    risk_level: Literal["none", "low", "medium", "high", "critical"]
    issues: List[Issue]


@dataclass
class Modification:
    original: str
    modified: str
    reason: str


@dataclass
class DeepReasonResult:
    legal_judgment: LegalJudgment
    modifications: List[Modification]
    postal_worker_explanation: str
    summary: str


ANALYSIS_PROMPT = """以下のテキストを法的観点から詳細に分析し、問題点と修正案を提案してください。

{fast_check_context}

## 分析対象テキスト:
{text}

## 出力形式 (JSON):
{{
  "legalJudgment": {{
    "isCompliant": boolean,
    "riskLevel": "none" | "low" | "medium" | "high" | "critical",
    "issues": [
      {{
        "type": "法的問題のカテゴリ",
        "description": "問題の詳細説明",
        "location": "問題箇所の引用",
        "suggestedFix": "修正案"
      }}
    ]
  }},
  "modifications": [
    {{
      "original": "元のテキスト",
      "modified": "修正後のテキスト",
      "reason": "修正理由"
    }}
  ],
  "postalWorkerExplanation": "郵便局員への説明文（わかりやすい日本語で）",
  "summary": "全体の要約（100文字以内）"
}}

法的観点には以下を含めてください：
- 個人情報保護法
- 名誉毀損・侮辱
- 脅迫・恐喝
- 景品表示法
- 特定商取引法
- 著作権法

郵便局員への説明は、以下の点に注意：
- 専門用語を避ける
- 具体的な問題箇所を引用する
- 修正案を提示する
- 丁寧な言葉遣い

必ず有効なJSONのみを出力してください。"""


def run_deep_reason(
    text: str, fast_check_result: Optional[dict] = None
) -> DeepReasonResult:
    """
    テキストを詳細に分析し、法的判定と修正案を生成する

    Args:
        text: 分析対象のテキスト
        fast_check_result: fast-checkの事前結果（オプション）

    Returns:
        DeepReasonResult: 分析結果
    """
    # Build context from fast check results
    fast_check_context = ""
    if fast_check_result:
        fast_check_context = f"""
## Fast Check Results (Pre-analysis):
{json.dumps(fast_check_result.get("ngWords", []), ensure_ascii=False, indent=2)}
"""

    prompt = ANALYSIS_PROMPT.format(
        text=text, fast_check_context=fast_check_context
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text

        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
        json_str = json_match.group(1) if json_match else content

        parsed = json.loads(json_str)

        # Build result
        issues = [
            Issue(
                type=i.get("type", ""),
                description=i.get("description", ""),
                location=i.get("location", ""),
                suggested_fix=i.get("suggestedFix", ""),
            )
            for i in parsed.get("legalJudgment", {}).get("issues", [])
        ]

        legal_judgment = LegalJudgment(
            is_compliant=parsed.get("legalJudgment", {}).get("isCompliant", True),
            risk_level=parsed.get("legalJudgment", {}).get("riskLevel", "none"),
            issues=issues,
        )

        modifications = [
            Modification(
                original=m.get("original", ""),
                modified=m.get("modified", ""),
                reason=m.get("reason", ""),
            )
            for m in parsed.get("modifications", [])
        ]

        return DeepReasonResult(
            legal_judgment=legal_judgment,
            modifications=modifications,
            postal_worker_explanation=parsed.get(
                "postalWorkerExplanation", "解析に失敗しました。"
            ),
            summary=parsed.get("summary", ""),
        )

    except Exception as e:
        print(f"Error in deep_reason: {e}", file=sys.stderr)
        return DeepReasonResult(
            legal_judgment=LegalJudgment(
                is_compliant=True, risk_level="none", issues=[]
            ),
            modifications=[],
            postal_worker_explanation="解析に失敗しました。",
            summary="エラーが発生しました。",
        )


def result_to_dict(result: DeepReasonResult) -> dict:
    """Convert result to JSON-serializable dict"""
    return {
        "legalJudgment": {
            "isCompliant": result.legal_judgment.is_compliant,
            "riskLevel": result.legal_judgment.risk_level,
            "issues": [
                {
                    "type": i.type,
                    "description": i.description,
                    "location": i.location,
                    "suggestedFix": i.suggested_fix,
                }
                for i in result.legal_judgment.issues
            ],
        },
        "modifications": [
            {
                "original": m.original,
                "modified": m.modified,
                "reason": m.reason,
            }
            for m in result.modifications
        ],
        "postalWorkerExplanation": result.postal_worker_explanation,
        "summary": result.summary,
    }


def main():
    """CLI entry point for testing"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python deep_reason.py <text> [fast_check_json]")
        sys.exit(1)

    text = sys.argv[1]
    fast_check_result = None

    if len(sys.argv) > 2:
        try:
            fast_check_result = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            pass

    result = run_deep_reason(text, fast_check_result)
    output = result_to_dict(result)

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
