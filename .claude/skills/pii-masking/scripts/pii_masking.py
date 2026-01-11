#!/usr/bin/env python3
"""
PII Masking Skill - Microsoft Presidio を使用した個人情報検出・匿名化

テキスト内の個人名、住所、電話番号などを検出し、プレースホルダーに置換します。
"""

import json
import sys
import warnings
from dataclasses import dataclass
from typing import List, Optional, Dict

# Suppress warnings to stderr (not stdout)
warnings.filterwarnings("ignore")

from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig


# Entity type to placeholder mapping
ENTITY_PLACEHOLDERS = {
    "PERSON": "<PERSON>",
    "LOCATION": "<ADDRESS>",
    "ADDRESS": "<ADDRESS>",
    "PHONE_NUMBER": "<PHONE>",
    "EMAIL_ADDRESS": "<EMAIL>",
    "CREDIT_CARD": "<CREDIT_CARD>",
    "DATE_TIME": "<DATE>",
    "NRP": "<NRP>",  # Nationality, Religion, Political group
    "ORGANIZATION": "<ORG>",
    "IP_ADDRESS": "<IP>",
    "URL": "<URL>",
}


@dataclass
class DetectedEntity:
    type: str
    text: str
    start: int
    end: int
    score: float


@dataclass
class PIIMaskingResult:
    masked_text: str
    detected_entities: List[DetectedEntity]
    statistics: Dict


def create_analyzer(language: str = "ja") -> AnalyzerEngine:
    """Create and configure the Presidio analyzer"""
    # Configure NLP engine for Japanese
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "ja", "model_name": "ja_core_news_lg"}],
    }

    provider = NlpEngineProvider(nlp_configuration=configuration)
    nlp_engine = provider.create_engine()

    # Create analyzer with Japanese NLP engine
    registry = RecognizerRegistry()
    registry.load_predefined_recognizers(nlp_engine=nlp_engine)

    analyzer = AnalyzerEngine(
        nlp_engine=nlp_engine,
        registry=registry,
        supported_languages=["ja", "en"],
    )

    return analyzer


def run_pii_masking(
    text: str,
    entities: Optional[List[str]] = None,
    language: str = "ja",
    score_threshold: float = 0.7,
) -> PIIMaskingResult:
    """
    テキスト内のPIIを検出してマスキングする

    Args:
        text: マスキング対象のテキスト
        entities: 検出対象のエンティティタイプ（Noneで全て）
        language: 言語コード (default: "ja")
        score_threshold: 検出スコアの閾値 (default: 0.7)

    Returns:
        PIIMaskingResult: マスキング結果
    """
    try:
        # Initialize engines
        analyzer = create_analyzer(language)
        anonymizer = AnonymizerEngine()

        # Define entities to detect
        if entities is None:
            entities = list(ENTITY_PLACEHOLDERS.keys())

        # Analyze text for PII
        results = analyzer.analyze(
            text=text,
            entities=entities,
            language=language,
            score_threshold=score_threshold,
        )

        # Build detected entities list
        detected_entities = [
            DetectedEntity(
                type=r.entity_type,
                text=text[r.start : r.end],
                start=r.start,
                end=r.end,
                score=r.score,
            )
            for r in results
        ]

        # Create operator configs for anonymization
        operators = {
            entity: OperatorConfig(
                "replace", {"new_value": ENTITY_PLACEHOLDERS.get(entity, f"<{entity}>")}
            )
            for entity in entities
        }

        # Anonymize text
        anonymized = anonymizer.anonymize(
            text=text, analyzer_results=results, operators=operators
        )

        # Calculate statistics
        type_counts: Dict[str, int] = {}
        for entity in detected_entities:
            type_counts[entity.type] = type_counts.get(entity.type, 0) + 1

        statistics = {
            "totalDetected": len(detected_entities),
            "byType": type_counts,
        }

        return PIIMaskingResult(
            masked_text=anonymized.text,
            detected_entities=detected_entities,
            statistics=statistics,
        )

    except Exception as e:
        print(f"Error in pii_masking: {e}", file=sys.stderr)
        return PIIMaskingResult(
            masked_text=text,
            detected_entities=[],
            statistics={"totalDetected": 0, "byType": {}},
        )


def result_to_dict(result: PIIMaskingResult) -> dict:
    """Convert result to JSON-serializable dict"""
    return {
        "maskedText": result.masked_text,
        "detectedEntities": [
            {
                "type": e.type,
                "text": e.text,
                "start": e.start,
                "end": e.end,
                "score": e.score,
            }
            for e in result.detected_entities
        ],
        "statistics": result.statistics,
    }


def main():
    """CLI entry point for testing"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python pii_masking.py <text> [score_threshold]")
        sys.exit(1)

    text = sys.argv[1]
    score_threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.7

    result = run_pii_masking(text, score_threshold=score_threshold)
    output = result_to_dict(result)

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
