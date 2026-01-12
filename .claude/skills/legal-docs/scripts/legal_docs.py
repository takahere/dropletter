#!/usr/bin/env python3
"""
Legal Documents Generator
利用規約・プライバシーポリシーを生成するスキル
"""

import json
import sys
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class Company:
    name: str
    representative: str
    address: str
    email: str
    name_en: Optional[str] = None
    phone: Optional[str] = None
    registration_number: Optional[str] = None


@dataclass
class Service:
    name: str
    url: str
    description: str
    launch_date: str


@dataclass
class Features:
    has_user_accounts: bool = False
    has_payment: bool = False
    has_file_upload: bool = False
    has_ai_processing: bool = False
    has_third_party_integration: bool = False
    collects_personal_info: bool = False
    uses_analytics: bool = False
    uses_cookies: bool = False


@dataclass
class ThirdPartyService:
    name: str
    purpose: str
    data_shared: List[str]
    privacy_policy_url: str


def generate_terms_of_service(
    company: Company,
    service: Service,
    features: Features,
    third_party_services: List[ThirdPartyService],
    target_regions: List[str],
    effective_date: str
) -> str:
    """利用規約を生成"""

    sections = []

    # ヘッダー
    sections.append(f"""# {service.name} 利用規約

最終更新日: {effective_date}
施行日: {effective_date}

---

""")

    # 第1条: 総則
    sections.append(f"""## 第1条（総則）

1. この利用規約（以下「本規約」といいます）は、{company.name}（以下「当社」といいます）が提供する「{service.name}」（以下「本サービス」といいます）の利用条件を定めるものです。

2. 本サービスをご利用いただくすべてのお客様（以下「ユーザー」といいます）は、本規約に同意したものとみなします。

3. 本規約に同意いただけない場合は、本サービスをご利用いただけません。

---

""")

    # 第2条: 定義
    definitions = [
        ("本サービス", f"{service.name}（{service.url}）およびこれに付随するすべての機能"),
        ("ユーザー", "本サービスを利用するすべての方"),
        ("コンテンツ", "ユーザーが本サービスにアップロード、送信、保存するデータ、ファイル、テキスト等"),
    ]

    if features.has_user_accounts:
        definitions.append(("アカウント", "本サービスを利用するために登録される個人識別情報"))

    if features.has_payment:
        definitions.append(("有料プラン", "料金を支払うことで利用可能となる追加機能"))

    sections.append("""## 第2条（定義）

本規約において、以下の用語は次の意味で使用します。

""")

    for i, (term, definition) in enumerate(definitions, 1):
        sections.append(f"{i}. 「{term}」とは、{definition}をいいます。\n")

    sections.append("\n---\n\n")

    # 第3条: サービス内容
    sections.append(f"""## 第3条（サービス内容）

1. 本サービスは、{service.description}

2. 当社は、ユーザーに事前に通知することなく、本サービスの内容を変更、追加、または廃止することがあります。

3. 当社は、本サービスの変更等によりユーザーに生じた損害について、一切の責任を負いません。

---

""")

    # 第4条: アカウント（アカウント機能がある場合）
    if features.has_user_accounts:
        sections.append("""## 第4条（アカウント）

1. ユーザーは、本サービスの一部機能を利用するためにアカウントを登録することができます。

2. ユーザーは、登録情報に変更があった場合、速やかに変更手続きを行うものとします。

3. ユーザーは、自己のアカウント情報を適切に管理する責任を負います。

4. アカウント情報の管理不十分、第三者による不正使用等によりユーザーに損害が生じた場合、当社は一切の責任を負いません。

5. ユーザーは、いつでもアカウントを削除することができます。

---

""")

    # 第5条: 料金（決済機能がある場合）
    if features.has_payment:
        sections.append("""## 第5条（料金および支払い）

1. 有料プランの料金は、本サービスのウェブサイトに表示される金額とします。

2. ユーザーは、当社が指定する方法により料金を支払うものとします。

3. 支払済みの料金は、法令に定める場合を除き、返金いたしません。

4. サブスクリプション型プランは、解約手続きを行わない限り自動更新されます。

5. 料金の変更は、変更の30日前までにユーザーに通知します。

---

""")

    # 第6条: 禁止事項
    prohibited_items = [
        "法令または公序良俗に違反する行為",
        "犯罪行為に関連する行為",
        "当社または第三者の知的財産権、肖像権、プライバシー、名誉その他の権利を侵害する行為",
        "当社のサーバーまたはネットワークに過度な負荷をかける行為",
        "本サービスの運営を妨害する行為",
        "不正アクセス、またはこれを試みる行為",
        "他のユーザーになりすます行為",
        "当社が許諾しない営業、宣伝、広告、勧誘その他の行為",
        "反社会的勢力等への利益供与",
        "その他、当社が不適切と判断する行為",
    ]

    if features.has_file_upload:
        prohibited_items.insert(3, "マルウェア、ウイルス等の有害なプログラムをアップロードする行為")
        prohibited_items.insert(4, "著作権を侵害するコンテンツをアップロードする行為")

    sections.append("""## 第6条（禁止事項）

ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。

""")

    for i, item in enumerate(prohibited_items, 1):
        sections.append(f"{i}. {item}\n")

    sections.append("\n---\n\n")

    # 第7条: コンテンツの取扱い
    if features.has_file_upload:
        sections.append("""## 第7条（コンテンツの取扱い）

1. ユーザーが本サービスにアップロードしたコンテンツの著作権は、ユーザーまたは正当な権利者に帰属します。

2. ユーザーは、当社に対し、本サービスの提供・改善に必要な範囲で、コンテンツを使用、複製、処理する権利を許諾します。

3. 当社は、法令に基づく場合を除き、ユーザーのコンテンツを第三者に開示しません。

4. 当社は、ユーザーのコンテンツについて、バックアップの義務を負いません。

---

""")

    # 第8条: AI処理（AI機能がある場合）
    if features.has_ai_processing:
        sections.append("""## 第8条（AI処理）

1. 本サービスは、人工知能（AI）技術を使用してコンテンツを処理します。

2. AI処理の結果は参考情報であり、その正確性、完全性を保証するものではありません。

3. ユーザーは、AI処理の結果に基づく最終判断について、自己の責任において行うものとします。

4. 当社は、AI処理の結果に起因するいかなる損害についても責任を負いません。

5. 本サービスのAI処理は法的助言を構成するものではなく、必要に応じて専門家にご相談ください。

---

""")

    # 第9条: 知的財産権
    sections.append(f"""## 第9条（知的財産権）

1. 本サービスに関する著作権、商標権その他の知的財産権は、当社または正当な権利者に帰属します。

2. ユーザーは、当社の事前の書面による承諾なく、本サービスの内容を複製、転載、改変、その他二次利用することはできません。

---

""")

    # 第10条: 免責事項
    sections.append("""## 第10条（免責事項）

1. 当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）がないことを明示的にも黙示的にも保証しません。

2. 当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、消費者契約法その他の法令により当社の責任が認められる場合は、この限りではありません。

3. 前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます）による債務不履行または不法行為によりユーザーに生じた損害のうち、特別な事情から生じた損害について一切の責任を負いません。

4. 本サービスに関してユーザーと第三者との間において生じた取引、連絡または紛争等について、当社は一切責任を負いません。

---

""")

    # 第11条: サービスの停止・終了
    sections.append("""## 第11条（サービスの停止・終了）

1. 当社は、以下の場合、事前の通知なく本サービスの全部または一部を停止することができます。
   - システムの保守点検を行う場合
   - 地震、落雷、火災等の不可抗力により本サービスの提供が困難な場合
   - その他、当社が停止を必要と判断した場合

2. 当社は、ユーザーに30日前までに通知することにより、本サービスを終了することができます。

3. 当社は、本サービスの停止・終了によりユーザーに生じた損害について、一切の責任を負いません。

---

""")

    # 第12条: 利用停止
    sections.append("""## 第12条（利用停止）

1. 当社は、ユーザーが以下のいずれかに該当すると判断した場合、事前の通知なくユーザーの利用を停止することができます。
   - 本規約に違反した場合
   - 登録情報に虚偽があることが判明した場合
   - 当社からの連絡に対し、一定期間応答がない場合
   - その他、当社がユーザーの利用を不適切と判断した場合

2. 当社は、本条に基づく利用停止によりユーザーに生じた損害について、一切の責任を負いません。

---

""")

    # 第13条: 規約の変更
    sections.append("""## 第13条（規約の変更）

1. 当社は、必要と判断した場合には、ユーザーに通知することなく本規約を変更することができます。

2. 変更後の本規約は、本サービスのウェブサイトに掲載された時点から効力を生じるものとします。

3. 本規約の変更後、本サービスを利用した場合、ユーザーは変更後の規約に同意したものとみなします。

---

""")

    # 第14条: 準拠法・管轄
    sections.append(f"""## 第14条（準拠法・管轄裁判所）

1. 本規約の解釈にあたっては、日本法を準拠法とします。

2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。

---

## 附則

本規約は{effective_date}から施行します。

---

{company.name}
代表者: {company.representative}
所在地: {company.address}
連絡先: {company.email}
""")

    return "".join(sections)


def generate_privacy_policy(
    company: Company,
    service: Service,
    features: Features,
    third_party_services: List[ThirdPartyService],
    target_regions: List[str],
    effective_date: str
) -> str:
    """プライバシーポリシーを生成"""

    sections = []

    # ヘッダー
    sections.append(f"""# {service.name} プライバシーポリシー

最終更新日: {effective_date}
施行日: {effective_date}

---

{company.name}（以下「当社」といいます）は、「{service.name}」（以下「本サービス」といいます）における個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。

---

""")

    # 事業者情報
    sections.append(f"""## 1. 事業者情報

- 事業者名: {company.name}
- 代表者: {company.representative}
- 所在地: {company.address}
- 連絡先: {company.email}
""")

    if company.phone:
        sections.append(f"- 電話番号: {company.phone}\n")

    if company.registration_number:
        sections.append(f"- 法人番号: {company.registration_number}\n")

    sections.append("\n---\n\n")

    # 収集する情報
    collected_info = []

    if features.has_user_accounts:
        collected_info.extend([
            "メールアドレス",
            "パスワード（暗号化して保存）",
            "表示名・プロフィール情報",
        ])

    if features.has_payment:
        collected_info.extend([
            "氏名",
            "請求先住所",
            "決済情報（クレジットカード情報は決済代行会社が保持）",
        ])

    if features.has_file_upload:
        collected_info.extend([
            "アップロードされたファイル",
            "ファイルのメタデータ（ファイル名、サイズ、形式等）",
        ])

    if features.uses_analytics:
        collected_info.extend([
            "IPアドレス",
            "ブラウザ情報",
            "デバイス情報",
            "アクセス日時",
            "閲覧ページ",
            "リファラー情報",
        ])

    sections.append("""## 2. 収集する個人情報

当社は、以下の個人情報を収集することがあります。

""")

    for i, info in enumerate(collected_info, 1):
        sections.append(f"{i}. {info}\n")

    sections.append("\n---\n\n")

    # 収集方法
    sections.append("""## 3. 個人情報の収集方法

当社は、以下の方法で個人情報を収集します。

1. ユーザーが本サービスに入力した情報
2. ユーザーがアップロードしたファイル
3. 本サービスの利用に伴い自動的に収集される情報（アクセスログ等）
4. Cookieおよび類似技術による収集

---

""")

    # 利用目的
    purposes = [
        "本サービスの提供・運営",
        "ユーザーからのお問い合わせへの対応",
        "本サービスの改善・新機能開発",
        "利用状況の分析・統計",
        "不正利用の防止・セキュリティ確保",
        "重要なお知らせの送信",
    ]

    if features.has_payment:
        purposes.insert(1, "料金の請求・決済処理")

    if features.has_ai_processing:
        purposes.insert(2, "AIによるコンテンツ処理・分析")

    sections.append("""## 4. 個人情報の利用目的

当社は、収集した個人情報を以下の目的で利用します。

""")

    for i, purpose in enumerate(purposes, 1):
        sections.append(f"{i}. {purpose}\n")

    sections.append("\n---\n\n")

    # 第三者提供
    sections.append("""## 5. 個人情報の第三者提供

当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。

1. 法令に基づく場合
2. 人の生命、身体または財産の保護のために必要がある場合
3. 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合
4. 国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合

---

""")

    # 外部サービス
    if third_party_services:
        sections.append("""## 6. 外部サービスとの連携

当社は、本サービスの提供のため、以下の外部サービスを利用しています。

""")

        for service in third_party_services:
            sections.append(f"""### {service.name}

- 利用目的: {service.purpose}
- 共有データ: {', '.join(service.data_shared)}
- プライバシーポリシー: {service.privacy_policy_url}

""")

        sections.append("---\n\n")

    # Cookie
    if features.uses_cookies:
        sections.append("""## 7. Cookieの使用

当社は、本サービスにおいてCookieを使用しています。

### Cookieの種類と目的

1. **必須Cookie**: 本サービスの基本機能に必要
2. **機能Cookie**: ユーザー設定の保存
3. **分析Cookie**: 利用状況の分析（Google Analytics等）

### Cookieの管理

ユーザーは、ブラウザの設定によりCookieを無効にすることができます。ただし、一部の機能が利用できなくなる場合があります。

---

""")

    # データ保持期間
    sections.append("""## 8. データの保持期間

当社は、個人情報を以下の期間保持します。

1. アカウント情報: アカウント削除まで
2. アップロードファイル: 処理完了後30日間
3. ログデータ: 最大12ヶ月間
4. 決済情報: 法令に定める期間

---

""")

    # セキュリティ
    sections.append("""## 9. セキュリティ対策

当社は、個人情報の漏洩、滅失、毀損を防止するため、以下のセキュリティ対策を実施しています。

1. SSL/TLS暗号化通信
2. パスワードのハッシュ化保存
3. アクセス権限の適切な管理
4. 定期的なセキュリティ監査
5. 従業員への教育・研修

---

""")

    # ユーザーの権利
    sections.append("""## 10. ユーザーの権利

ユーザーは、当社に対して以下の権利を有します。

1. **アクセス権**: 保有する個人情報の開示を請求する権利
2. **訂正権**: 誤った個人情報の訂正を請求する権利
3. **削除権**: 個人情報の削除を請求する権利
4. **利用停止権**: 個人情報の利用停止を請求する権利

これらの権利を行使する場合は、下記連絡先までご連絡ください。

---

""")

    # GDPR対応（EU居住者向け）
    if 'eu' in target_regions or 'global' in target_regions:
        sections.append("""## 11. EU居住者の方へ（GDPR）

EU一般データ保護規則（GDPR）に基づき、EU居住者のユーザーは以下の追加の権利を有します。

1. **データポータビリティ権**: 個人情報を構造化された形式で受け取る権利
2. **異議申立権**: 個人情報の処理に異議を申し立てる権利
3. **自動処理に関する権利**: 自動処理のみに基づく決定に異議を申し立てる権利

当社のEU代表者への連絡は、下記連絡先までお願いします。

---

""")

    # CCPA対応（米国居住者向け）
    if 'us' in target_regions or 'global' in target_regions:
        sections.append("""## 12. カリフォルニア州居住者の方へ（CCPA）

カリフォルニア消費者プライバシー法（CCPA）に基づき、カリフォルニア州居住者は以下の権利を有します。

1. **知る権利**: 収集・使用・共有される個人情報のカテゴリを知る権利
2. **削除権**: 個人情報の削除を請求する権利
3. **オプトアウト権**: 個人情報の販売を拒否する権利
4. **差別禁止**: 権利行使を理由とした差別を受けない権利

当社は、ユーザーの個人情報を販売しません。

---

""")

    # ポリシーの変更
    sections.append("""## 13. プライバシーポリシーの変更

当社は、必要に応じて本ポリシーを変更することがあります。重要な変更がある場合は、本サービス上での通知またはメールにてお知らせします。

---

""")

    # お問い合わせ
    sections.append(f"""## 14. お問い合わせ

本ポリシーに関するお問い合わせは、以下までご連絡ください。

- 会社名: {company.name}
- 担当: 個人情報保護管理者
- メール: {company.email}
""")

    if company.phone:
        sections.append(f"- 電話: {company.phone}\n")

    sections.append(f"""
---

制定日: {effective_date}
{company.name}
""")

    return "".join(sections)


def generate_tokushoho(
    company: Company,
    service: Service,
    payment_info: Optional[Dict] = None
) -> str:
    """特定商取引法に基づく表記を生成"""

    content = f"""# 特定商取引法に基づく表記

## 販売業者
{company.name}

## 代表者
{company.representative}

## 所在地
{company.address}

## 連絡先
メール: {company.email}
"""

    if company.phone:
        content += f"電話: {company.phone}\n"

    content += f"""
## 販売URL
{service.url}

## 販売価格
サービスのウェブサイトに表示された価格

## 追加料金
消費税が含まれます。別途インターネット接続料金がかかります。

## 支払方法
クレジットカード決済

## 支払時期
サービス利用開始時

## サービス提供時期
決済完了後、即時

## 返品・キャンセル
デジタルサービスの性質上、原則として返金はいたしません。
ただし、サービスに重大な瑕疵がある場合はこの限りではありません。

## 解約方法
アカウント設定画面から解約手続きを行えます。

## 動作環境
- インターネット接続環境
- 最新版のウェブブラウザ（Chrome, Firefox, Safari, Edge）
"""

    return content


def run_legal_docs(input_data: Dict) -> Dict:
    """メイン処理"""

    # 入力データのパース
    company = Company(
        name=input_data["company"]["name"],
        representative=input_data["company"]["representative"],
        address=input_data["company"]["address"],
        email=input_data["company"]["email"],
        name_en=input_data["company"].get("nameEn"),
        phone=input_data["company"].get("phone"),
        registration_number=input_data["company"].get("registrationNumber"),
    )

    service = Service(
        name=input_data["service"]["name"],
        url=input_data["service"]["url"],
        description=input_data["service"]["description"],
        launch_date=input_data["service"]["launchDate"],
    )

    features = Features(
        has_user_accounts=input_data["features"].get("hasUserAccounts", False),
        has_payment=input_data["features"].get("hasPayment", False),
        has_file_upload=input_data["features"].get("hasFileUpload", False),
        has_ai_processing=input_data["features"].get("hasAIProcessing", False),
        has_third_party_integration=input_data["features"].get("hasThirdPartyIntegration", False),
        collects_personal_info=input_data["features"].get("collectsPersonalInfo", False),
        uses_analytics=input_data["features"].get("usesAnalytics", False),
        uses_cookies=input_data["features"].get("usesCookies", False),
    )

    third_party_services = []
    for svc in input_data.get("thirdPartyServices", []):
        third_party_services.append(ThirdPartyService(
            name=svc["name"],
            purpose=svc["purpose"],
            data_shared=svc["dataShared"],
            privacy_policy_url=svc["privacyPolicyUrl"],
        ))

    target_regions = input_data.get("targetRegions", ["japan"])
    effective_date = datetime.now().strftime("%Y年%m月%d日")

    # ドキュメント生成
    terms = generate_terms_of_service(
        company, service, features, third_party_services, target_regions, effective_date
    )

    privacy = generate_privacy_policy(
        company, service, features, third_party_services, target_regions, effective_date
    )

    result = {
        "termsOfService": {
            "markdown": terms,
            "version": "1.0",
            "effectiveDate": effective_date,
        },
        "privacyPolicy": {
            "markdown": privacy,
            "version": "1.0",
            "effectiveDate": effective_date,
        },
        "metadata": {
            "generatedAt": datetime.now().isoformat(),
            "complianceChecklist": [
                "民法準拠",
                "消費者契約法準拠",
                "個人情報保護法準拠",
            ],
            "warnings": [
                "本ドキュメントは自動生成されたものです。必ず弁護士によるレビューを受けてください。",
                "業界固有の規制がある場合は追加条項が必要です。",
            ],
        },
    }

    # 決済機能がある場合は特商法表記も生成
    if features.has_payment:
        result["tokushoho"] = {
            "markdown": generate_tokushoho(company, service),
        }
        result["metadata"]["complianceChecklist"].append("特定商取引法準拠")

    # GDPR/CCPA対応
    if "eu" in target_regions or "global" in target_regions:
        result["metadata"]["complianceChecklist"].append("GDPR準拠条項あり")

    if "us" in target_regions or "global" in target_regions:
        result["metadata"]["complianceChecklist"].append("CCPA準拠条項あり")

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: legal_docs.py '<input_json>'", file=sys.stderr)
        print("\nExample:", file=sys.stderr)
        print('  legal_docs.py \'{"company":{"name":"株式会社テスト",...},...}\'', file=sys.stderr)
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        sys.exit(1)

    result = run_legal_docs(input_data)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
