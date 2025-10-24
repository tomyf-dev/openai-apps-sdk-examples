# Pizzaz MCP server (Hono + Cloudflare Workers)

このディレクトリには Hono と Cloudflare Workers を用いて構築した Model Context Protocol (MCP) サーバーが含まれています。Apps SDK 用にビルドされた Pizzaz ウィジェットを Cloudflare R2 に配置し、ChatGPT のコネクタ機能から利用できるようにします。

## 特徴

- `hono` を利用した軽量なルーティング
- `@hono/mcp` の `StreamableHTTPTransport` による HTTP ストリーミング対応
- `@modelcontextprotocol/sdk` を用いた MCP 実装
- Cloudflare R2 上のアセットを用いたウィジェット HTML の動的生成

## 事前準備

- Node.js 20 以上
- [pnpm](https://pnpm.io/) もしくは npm/yarn
- Cloudflare アカウントと [Workers](https://developers.cloudflare.com/workers/) プロジェクト
- R2 バケット (例: `pizzaz-assets`)

## 依存関係のインストール

```bash
pnpm install
```

## ウィジェットアセットのビルド

ルートディレクトリでビルドコマンドを実行し、`assets/` に HTML/JS/CSS を生成します。

```bash
pnpm run build
```

ビルド後の `assets/` ディレクトリを Cloudflare R2 にアップロードしてください。`wrangler` を利用している場合は次のように同期できます。

```bash
wrangler r2 bucket create pizzaz-assets
wrangler r2 object put pizzaz-assets/pizzaz.js --file ../assets/pizzaz-xxxx.js
# 他のファイルも同様にアップロード
```

## ローカルでの開発

```bash
pnpm dev
```

`wrangler dev` はローカル環境で Workers を実行し、R2 バケットにアクセスします。ローカル開発時には `wrangler.toml` の `vars.BASE_URL` を `http://localhost:8787` に設定し、`assets` ディレクトリを serve できるようにしておくと便利です。

## デプロイ

1. `wrangler.toml` の `name` と `vars.BASE_URL` をデプロイ先の URL に更新します。
2. `pnpm deploy` を実行します。

```bash
pnpm deploy
```

## ChatGPT コネクタへの追加

1. `https://<your-worker-domain>/mcp` をエンドポイントとして追加します。
2. ChatGPT 上でコネクタを有効化し、ウィジェット関連のツールが利用できることを確認します。

## 構成ファイル

- `src/worker.ts` : Hono による MCP エンドポイントとアセット配信
- `widgets.ts` : ウィジェット定義とレスポンス共通処理
- `wrangler.toml` : Workers デプロイ設定（Static Assets バインディング）
- `tsconfig.json` : TypeScript 設定
- `package.json` : 依存関係とスクリプト

必要に応じて R2 バケットや環境変数の設定を更新し、ChatGPT から利用できるようにしてください。

