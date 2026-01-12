"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          トップに戻る
        </Link>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>DropLetter プライバシーポリシー</h1>

          <p className="text-sm text-slate-500">
            最終更新日: 2024年1月15日
            <br />
            施行日: 2024年1月15日
          </p>

          <hr />

          <p>
            DropLetter運営（以下「当社」といいます）は、「DropLetter」（以下「本サービス」といいます）における個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
          </p>

          <h2>1. 事業者情報</h2>
          <ul>
            <li>事業者名: DropLetter運営</li>
            <li>連絡先: support@dropletter.app</li>
          </ul>

          <h2>2. 収集する個人情報</h2>
          <p>当社は、以下の個人情報を収集することがあります。</p>
          <ol>
            <li>メールアドレス</li>
            <li>パスワード（暗号化して保存）</li>
            <li>表示名・プロフィール情報</li>
            <li>氏名（決済時）</li>
            <li>請求先住所（決済時）</li>
            <li>決済情報（クレジットカード情報は決済代行会社が保持）</li>
            <li>アップロードされたファイル</li>
            <li>ファイルのメタデータ（ファイル名、サイズ、形式等）</li>
            <li>IPアドレス</li>
            <li>ブラウザ情報</li>
            <li>デバイス情報</li>
            <li>アクセス日時</li>
            <li>閲覧ページ</li>
            <li>リファラー情報</li>
          </ol>

          <h2>3. 個人情報の収集方法</h2>
          <p>当社は、以下の方法で個人情報を収集します。</p>
          <ol>
            <li>ユーザーが本サービスに入力した情報</li>
            <li>ユーザーがアップロードしたファイル</li>
            <li>本サービスの利用に伴い自動的に収集される情報（アクセスログ等）</li>
            <li>Cookieおよび類似技術による収集</li>
          </ol>

          <h2>4. 個人情報の利用目的</h2>
          <p>当社は、収集した個人情報を以下の目的で利用します。</p>
          <ol>
            <li>本サービスの提供・運営</li>
            <li>料金の請求・決済処理</li>
            <li>AIによるコンテンツ処理・分析</li>
            <li>ユーザーからのお問い合わせへの対応</li>
            <li>本サービスの改善・新機能開発</li>
            <li>利用状況の分析・統計</li>
            <li>不正利用の防止・セキュリティ確保</li>
            <li>重要なお知らせの送信</li>
          </ol>

          <h2>5. 個人情報の第三者提供</h2>
          <p>
            当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。
          </p>
          <ol>
            <li>法令に基づく場合</li>
            <li>人の生命、身体または財産の保護のために必要がある場合</li>
            <li>
              公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合
            </li>
            <li>
              国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
            </li>
          </ol>

          <h2>6. 外部サービスとの連携</h2>
          <p>
            当社は、本サービスの提供のため、以下の外部サービスを利用しています。
          </p>

          <h3>Supabase</h3>
          <ul>
            <li>利用目的: データベース、認証</li>
            <li>共有データ: アカウント情報、アップロードデータ</li>
            <li>
              プライバシーポリシー:{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://supabase.com/privacy
              </a>
            </li>
          </ul>

          <h3>Stripe</h3>
          <ul>
            <li>利用目的: 決済処理</li>
            <li>共有データ: 決済情報、請求先情報</li>
            <li>
              プライバシーポリシー:{" "}
              <a
                href="https://stripe.com/jp/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://stripe.com/jp/privacy
              </a>
            </li>
          </ul>

          <h3>Anthropic (Claude API)</h3>
          <ul>
            <li>利用目的: AI処理</li>
            <li>共有データ: 処理対象テキスト</li>
            <li>
              プライバシーポリシー:{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.anthropic.com/privacy
              </a>
            </li>
          </ul>

          <h3>LlamaCloud</h3>
          <ul>
            <li>利用目的: PDF解析</li>
            <li>共有データ: アップロードされたPDFファイル</li>
            <li>
              プライバシーポリシー:{" "}
              <a
                href="https://www.llamaindex.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.llamaindex.ai/privacy
              </a>
            </li>
          </ul>

          <h3>Vercel</h3>
          <ul>
            <li>利用目的: ホスティング、アナリティクス</li>
            <li>共有データ: アクセスログ</li>
            <li>
              プライバシーポリシー:{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://vercel.com/legal/privacy-policy
              </a>
            </li>
          </ul>

          <h2>7. Cookieの使用</h2>
          <p>当社は、本サービスにおいてCookieを使用しています。</p>

          <h3>Cookieの種類と目的</h3>
          <ol>
            <li>
              <strong>必須Cookie</strong>: 本サービスの基本機能に必要
            </li>
            <li>
              <strong>機能Cookie</strong>: ユーザー設定の保存
            </li>
            <li>
              <strong>分析Cookie</strong>: 利用状況の分析
            </li>
          </ol>

          <h3>Cookieの管理</h3>
          <p>
            ユーザーは、ブラウザの設定によりCookieを無効にすることができます。ただし、一部の機能が利用できなくなる場合があります。
          </p>

          <h2>8. データの保持期間</h2>
          <p>当社は、個人情報を以下の期間保持します。</p>
          <ol>
            <li>アカウント情報: アカウント削除まで</li>
            <li>アップロードファイル: 処理完了後30日間</li>
            <li>ログデータ: 最大12ヶ月間</li>
            <li>決済情報: 法令に定める期間</li>
          </ol>

          <h2>9. セキュリティ対策</h2>
          <p>
            当社は、個人情報の漏洩、滅失、毀損を防止するため、以下のセキュリティ対策を実施しています。
          </p>
          <ol>
            <li>SSL/TLS暗号化通信</li>
            <li>パスワードのハッシュ化保存</li>
            <li>アクセス権限の適切な管理</li>
            <li>定期的なセキュリティ監査</li>
          </ol>

          <h2>10. ユーザーの権利</h2>
          <p>ユーザーは、当社に対して以下の権利を有します。</p>
          <ol>
            <li>
              <strong>アクセス権</strong>: 保有する個人情報の開示を請求する権利
            </li>
            <li>
              <strong>訂正権</strong>: 誤った個人情報の訂正を請求する権利
            </li>
            <li>
              <strong>削除権</strong>: 個人情報の削除を請求する権利
            </li>
            <li>
              <strong>利用停止権</strong>: 個人情報の利用停止を請求する権利
            </li>
          </ol>
          <p>
            これらの権利を行使する場合は、下記連絡先までご連絡ください。
          </p>

          <h2>11. EU居住者の方へ（GDPR）</h2>
          <p>
            EU一般データ保護規則（GDPR）に基づき、EU居住者のユーザーは以下の追加の権利を有します。
          </p>
          <ol>
            <li>
              <strong>データポータビリティ権</strong>:
              個人情報を構造化された形式で受け取る権利
            </li>
            <li>
              <strong>異議申立権</strong>:
              個人情報の処理に異議を申し立てる権利
            </li>
            <li>
              <strong>自動処理に関する権利</strong>:
              自動処理のみに基づく決定に異議を申し立てる権利
            </li>
          </ol>

          <h2>12. カリフォルニア州居住者の方へ（CCPA）</h2>
          <p>
            カリフォルニア消費者プライバシー法（CCPA）に基づき、カリフォルニア州居住者は以下の権利を有します。
          </p>
          <ol>
            <li>
              <strong>知る権利</strong>:
              収集・使用・共有される個人情報のカテゴリを知る権利
            </li>
            <li>
              <strong>削除権</strong>: 個人情報の削除を請求する権利
            </li>
            <li>
              <strong>オプトアウト権</strong>:
              個人情報の販売を拒否する権利
            </li>
            <li>
              <strong>差別禁止</strong>:
              権利行使を理由とした差別を受けない権利
            </li>
          </ol>
          <p>当社は、ユーザーの個人情報を販売しません。</p>

          <h2>13. プライバシーポリシーの変更</h2>
          <p>
            当社は、必要に応じて本ポリシーを変更することがあります。重要な変更がある場合は、本サービス上での通知またはメールにてお知らせします。
          </p>

          <h2>14. お問い合わせ</h2>
          <p>
            本ポリシーに関するお問い合わせは、以下までご連絡ください。
          </p>
          <ul>
            <li>事業者名: DropLetter運営</li>
            <li>担当: 個人情報保護管理者</li>
            <li>メール: support@dropletter.app</li>
          </ul>

          <hr />

          <p>
            制定日: 2024年1月15日
            <br />
            DropLetter運営
          </p>
        </article>
      </div>
    </div>
  )
}
