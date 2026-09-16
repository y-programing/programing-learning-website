# CloSkill（会員制動画学習サイト）

購入済み講座だけを一覧・視聴できる、日本語UIの学習サイトサンプルです。依存パッケージなしのVanilla HTML/CSS/JavaScriptで構成しています。

## セットアップ・起動

Node.js 18以上を用意し、リポジトリのルートで実行します。

```bash
npm run lint   # JavaScriptの構文チェック
npm test       # 権限・画面構造のテスト
npm run build  # dist/ に配信用ファイルを生成
npm start      # PayPal API（sandbox）を起動
```

生成された `index.html` は静的ホスティング（または任意のローカルサーバー）で配信できます。例えば `npx serve dist` で確認できます。開発時は `index.html` を直接開いても動作します。

## テスト用アカウント

| メールアドレス | パスワード | 購入済み講座 |
| --- | --- | --- |
| `tanaka@example.com` | `demo123` | HTML/CSS、JavaScript |
| `suzuki@example.com` | `demo123` | WordPress |

ログイン状態はブラウザの `localStorage` に保存されます。ログアウトするとセッションが削除されます。購入情報・講座情報は `app.js` 冒頭のモックデータで管理しています。

ログイン画面の「新規登録」から開発用アカウントを作成できます。登録ユーザーの購入済み講座は初期状態では空で、ユーザー情報はブラウザの `localStorage` に保存されます。

ログイン後、マイページの「新しい講座を探す」から講座一覧を開けます。HTML/CSSコース（19,800円）、JavaScript(jQuery)コース（24,800円）、WordPressコース（22,800円）の「購入する」ボタンは決済を行わない開発用モックで、購入するとそのユーザーのマイページに追加され、講座内容を視聴できるようになります。

## 環境変数

現行の静的モックでは環境変数は不要です。本番化する場合は、APIのベースURL（例: `VITE_API_BASE_URL`）や認証設定をフロントエンドに直書きせず、サーバー側の環境変数で管理してください。

PayPal連携を使う場合は`.env.example`を参考に、`PAYPAL_ENV`、`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_WEBHOOK_ID`をサーバー環境へ設定してください。秘密鍵はブラウザへ渡さず、`.env`をGitへコミットしないでください。

このリポジトリの認証・購入状態はまだ静的デモ用です。実運用前に、サーバーセッション/HttpOnly Cookie、ユーザーIDに紐づくDBの注文・購入履歴、CSRF対策、レート制限、Webhookの冪等性、監査ログを追加してください。PayPalの成功リダイレクトだけを購入根拠にせず、Webhookまたはサーバー側のキャプチャ結果をDBへ保存して動画APIでも再検証してください。

## 本番化で置き換える箇所

- `USERS` と `COURSES`（`app.js`）を、認証API・講座API・購入履歴APIへ置き換える。
- `localStorage` のセッションを、サーバー発行のHttpOnly/Secure Cookie（または既存の認証基盤）へ置き換える。パスワードはサーバー側でハッシュ化し、現在のモック値をそのまま使わない。
- `courseIsPurchased` のクライアント判定だけに依存せず、動画配信API側でもユーザーの購入権限を毎回検証する。
- 決済導入時は購入処理とWebhookをStripe等に接続し、Webhookで確定した購入状態をDBへ保存する。`purchasedCourseIds` がその置換対象です。
- 動画プレーヤーのサンプル表示を、認可済みの署名付き動画URL（CDN等）に置き換える。
- `server.mjs`の注文作成・キャプチャ・Webhook検証を、DBの注文/購入履歴、認証済みユーザー、監査ログ、レート制限と組み合わせて運用する。現在のインメモリ注文状態は開発用で、複数台構成では永続ストアへ置き換える。
