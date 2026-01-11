#!/usr/bin/env python3
"""
PDF Highlight - PDFからNGワード等の位置を特定

Usage:
    python pdf_highlight.py <pdf_path> <search_items_json>

    search_items_json: JSON array of search items
    [{"id": "1", "type": "ng_word", "text": "検索語", "severity": "high", "reason": "理由"}]
"""

import json
import sys
import unicodedata
from dataclasses import dataclass, field
from typing import List, Optional

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF not installed. Run: pip install pymupdf", file=sys.stderr)
    sys.exit(1)


@dataclass
class Position:
    """PDF上の位置情報（正規化座標）"""
    page_number: int  # 1-indexed
    x0: float  # normalized 0-1
    y0: float
    x1: float
    y1: float


@dataclass
class SearchItem:
    """検索対象アイテム"""
    id: str
    type: str
    text: str
    severity: str
    reason: Optional[str] = None
    suggested_fix: Optional[str] = None


def normalize_text(text: str) -> str:
    """日本語テキストの正規化"""
    # Unicode正規化（全角→半角、etc）
    text = unicodedata.normalize("NFKC", text)
    # 空白・改行を除去
    text = "".join(text.split())
    return text.lower()


def find_text_positions(doc: fitz.Document, search_text: str) -> List[Position]:
    """PDFから検索テキストの位置を取得"""
    positions = []
    normalized_search = normalize_text(search_text)

    print(f"[pdf_highlight] Searching for: '{search_text}' (normalized: '{normalized_search}')", file=sys.stderr)

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_rect = page.rect

        # 方法1: 直接検索（PDF内部のテキストをそのまま検索）
        text_instances = page.search_for(search_text)

        if text_instances:
            print(f"[pdf_highlight] Found {len(text_instances)} matches on page {page_num + 1} (direct search)", file=sys.stderr)
            for rect in text_instances:
                positions.append(Position(
                    page_number=page_num + 1,
                    x0=rect.x0 / page_rect.width,
                    y0=rect.y0 / page_rect.height,
                    x1=rect.x1 / page_rect.width,
                    y1=rect.y1 / page_rect.height,
                ))
        else:
            # 方法2: 正規化して検索
            page_text = page.get_text()
            normalized_page = normalize_text(page_text)

            # 正規化テキストで位置を探す
            if normalized_search in normalized_page:
                print(f"[pdf_highlight] Found match on page {page_num + 1} (normalized search)", file=sys.stderr)

                # テキストブロックから実際の位置を推定
                blocks = page.get_text("dict")["blocks"]
                for block in blocks:
                    if "lines" not in block:
                        continue
                    for line in block["lines"]:
                        for span in line["spans"]:
                            span_text = normalize_text(span["text"])
                            if normalized_search in span_text:
                                bbox = span["bbox"]
                                positions.append(Position(
                                    page_number=page_num + 1,
                                    x0=bbox[0] / page_rect.width,
                                    y0=bbox[1] / page_rect.height,
                                    x1=bbox[2] / page_rect.width,
                                    y1=bbox[3] / page_rect.height,
                                ))

    print(f"[pdf_highlight] Total positions found: {len(positions)}", file=sys.stderr)
    return positions


def run_pdf_highlight(file_path: str, search_items: List[dict]) -> dict:
    """メイン処理"""
    print(f"[pdf_highlight] Processing: {file_path}", file=sys.stderr)
    print(f"[pdf_highlight] Search items count: {len(search_items)}", file=sys.stderr)

    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        print(f"[pdf_highlight] PDF opened successfully, pages: {page_count}", file=sys.stderr)
    except Exception as e:
        error_msg = f"PDF open failed: {str(e)}"
        print(f"[pdf_highlight] ERROR: {error_msg}", file=sys.stderr)
        return {
            "error": error_msg,
            "highlights": [],
            "notFound": [],
            "pageCount": 0
        }

    highlights = []
    not_found = []

    for item in search_items:
        search_item = SearchItem(
            id=item["id"],
            type=item["type"],
            text=item["text"],
            severity=item.get("severity", "medium"),
            reason=item.get("reason"),
            suggested_fix=item.get("suggestedFix"),
        )

        positions = find_text_positions(doc, search_item.text)

        if positions:
            highlights.append({
                "id": search_item.id,
                "type": search_item.type,
                "text": search_item.text,
                "severity": search_item.severity,
                "reason": search_item.reason,
                "suggestedFix": search_item.suggested_fix,
                "positions": [
                    {
                        "pageNumber": p.page_number,
                        "x0": round(p.x0, 6),
                        "y0": round(p.y0, 6),
                        "x1": round(p.x1, 6),
                        "y1": round(p.y1, 6),
                    }
                    for p in positions
                ],
            })
        else:
            not_found.append(search_item.text)
            print(f"[pdf_highlight] NOT FOUND: '{search_item.text}'", file=sys.stderr)

    doc.close()

    result = {
        "highlights": highlights,
        "notFound": not_found,
        "pageCount": page_count,
    }

    print(f"[pdf_highlight] Result: {len(highlights)} highlights, {len(not_found)} not found", file=sys.stderr)
    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: pdf_highlight.py <pdf_path> [search_items_json]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Example:", file=sys.stderr)
        print('  python pdf_highlight.py test.pdf \'[{"id":"1","type":"ng_word","text":"テスト","severity":"high"}]\'', file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    # 検索アイテムはJSON文字列またはstdinから
    if len(sys.argv) >= 3:
        try:
            search_items = json.loads(sys.argv[2])
        except json.JSONDecodeError as e:
            print(f"Error parsing search_items JSON: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            search_items = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"Error reading JSON from stdin: {e}", file=sys.stderr)
            sys.exit(1)

    result = run_pdf_highlight(file_path, search_items)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
