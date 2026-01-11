#!/usr/bin/env python3
"""
Visual Parse Skill - LlamaParse を使用したPDF解析

OCRを使用せず、PDFを視覚的に解析してMarkdown形式に変換します。
"""

import json
import os
import sys
import warnings
from dataclasses import dataclass
from typing import List, Optional

# Suppress warnings to stderr (not stdout)
warnings.filterwarnings("ignore")

from llama_parse import LlamaParse


@dataclass
class PageContent:
    page_number: int
    content: str
    images: Optional[List[dict]] = None
    tables: Optional[List[dict]] = None


@dataclass
class DocumentMetadata:
    page_count: int
    title: Optional[str] = None
    author: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class VisualParseResult:
    markdown: str
    metadata: DocumentMetadata
    pages: List[PageContent]


def run_visual_parse(
    file_path: str,
    language: str = "ja",
    preserve_layout: bool = True,
) -> VisualParseResult:
    """
    PDFを視覚的に解析してMarkdown形式に変換する

    Args:
        file_path: PDFファイルのパス
        language: 言語コード (default: "ja")
        preserve_layout: レイアウトを保持するか (default: True)

    Returns:
        VisualParseResult: 解析結果
    """
    # Initialize LlamaParse
    # Note: LlamaParse uses visual analysis, NOT OCR
    api_key = os.environ.get("LLAMA_CLOUD_API_KEY")

    # デバッグ: APIキーの存在確認
    print(f"[visual_parse] LLAMA_CLOUD_API_KEY present: {bool(api_key)}", file=sys.stderr)

    if not api_key:
        print("[visual_parse] ERROR: LLAMA_CLOUD_API_KEY is not set!", file=sys.stderr)
        # エラー情報を含むJSONを出力して終了
        error_result = {
            "markdown": "",
            "metadata": {"pageCount": 0, "error": "LLAMA_CLOUD_API_KEY is not set"},
            "pages": [],
            "error": "LLAMA_CLOUD_API_KEY is not set"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

    parser = LlamaParse(
        api_key=api_key,
        result_type="markdown",
        language=language,
        # Use visual analysis mode (not OCR)
        parsing_instruction="""
        Parse this document using visual analysis.
        Preserve the original structure including:
        - Headings and subheadings
        - Tables with proper formatting
        - Lists (bullet and numbered)
        - Bold, italic, and other formatting

        Do NOT use OCR. Use visual analysis to understand the document structure.
        Output in clean Markdown format.
        """,
    )

    try:
        # Parse the document
        documents = parser.load_data(file_path)

        # Combine all pages into markdown
        markdown_parts = []
        pages = []

        for i, doc in enumerate(documents):
            page_content = doc.text
            markdown_parts.append(page_content)

            pages.append(
                PageContent(
                    page_number=i + 1,
                    content=page_content,
                    images=doc.metadata.get("images", []) if hasattr(doc, "metadata") else None,
                    tables=doc.metadata.get("tables", []) if hasattr(doc, "metadata") else None,
                )
            )

        full_markdown = "\n\n---\n\n".join(markdown_parts)

        # Extract metadata
        metadata = DocumentMetadata(
            page_count=len(documents),
            title=documents[0].metadata.get("title") if documents and hasattr(documents[0], "metadata") else None,
            author=documents[0].metadata.get("author") if documents and hasattr(documents[0], "metadata") else None,
        )

        return VisualParseResult(
            markdown=full_markdown,
            metadata=metadata,
            pages=pages,
        )

    except Exception as e:
        error_msg = str(e)
        print(f"Error in visual_parse: {error_msg}", file=sys.stderr)
        # エラー情報を含むJSONを出力して終了
        error_result = {
            "markdown": "",
            "metadata": {"pageCount": 0, "error": error_msg},
            "pages": [],
            "error": error_msg
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)


def result_to_dict(result: VisualParseResult) -> dict:
    """Convert result to JSON-serializable dict"""
    return {
        "markdown": result.markdown,
        "metadata": {
            "pageCount": result.metadata.page_count,
            "title": result.metadata.title,
            "author": result.metadata.author,
            "createdAt": result.metadata.created_at,
        },
        "pages": [
            {
                "pageNumber": p.page_number,
                "content": p.content,
                "images": p.images,
                "tables": p.tables,
            }
            for p in result.pages
        ],
    }


def main():
    """CLI entry point for testing"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python visual_parse.py <pdf_path> [language]")
        sys.exit(1)

    file_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "ja"

    result = run_visual_parse(file_path, language=language)
    output = result_to_dict(result)

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
