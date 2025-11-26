# App Store Connect MCP Server

[![npm version](https://badge.fury.io/js/app-store-connect-mcp-server.svg)](https://www.npmjs.com/package/app-store-connect-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for App Store Connect API. Analyze your iOS/macOS app performance, sales, reviews, and more directly from Cursor or Claude Desktop.

[日本語版 README はこちら](#日本語)

## Features

### 📱 App Management
- **list_apps** - List all apps in your App Store Connect account
- **get_app** - Get detailed information about a specific app
- **list_app_versions** - List all versions for an app
- **list_builds** - List all builds for an app

### ⭐ Reviews
- **list_reviews** - List customer reviews
- **get_review** - Get a specific review with response
- **respond_to_review** - Respond to a customer review
- **delete_review_response** - Delete a review response
- **analyze_reviews** - Analyze review sentiment, rating distribution, and trends

### 💰 Sales & Finance Reports
- **get_sales_report** - Get sales reports (daily/weekly/monthly/yearly)
- **get_finance_report** - Get financial reports by region
- **list_region_codes** - List available region codes

### 📊 Analytics
- **list_analytics_report_requests** - List analytics report requests
- **create_analytics_report_request** - Create a new analytics report request
- **list_analytics_reports** - List available analytics reports
- **list_analytics_report_instances** - List report instances
- **get_analytics_report_segments** - Get report segments
- **download_analytics_data** - Download analytics data
- **list_analytics_categories** - List analytics categories

### 🔧 Performance & Diagnostics
- **get_perf_power_metrics** - Get performance/power metrics
- **get_diagnostic_signatures** - Get diagnostic signatures (hangs, disk writes, etc.)
- **get_diagnostic_logs** - Get detailed diagnostic logs
- **list_metric_types** - List metric types
- **list_diagnostic_types** - List diagnostic types

### 🧪 TestFlight
- **list_beta_testers** - List beta testers
- **get_beta_tester** - Get tester details
- **invite_beta_tester** - Invite a new tester
- **remove_beta_tester** - Remove a tester
- **list_beta_groups** - List beta groups
- **create_beta_group** - Create a new beta group

## Installation

```bash
npm install -g @shincode/app-store-connect-mcp-server
```

Or use npx:

```bash
npx @shincode/app-store-connect-mcp-server
```

## Setup

### 1. Get API Key from App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** > **Integrations** > **App Store Connect API**
3. Click **Generate API Key**
4. Download the `.p8` file (you can only download it once!)
5. Note down your **Issuer ID** and **Key ID**

### 2. Configure for Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "app-store-connect": {
      "command": "npx",
      "args": ["-y", "@shincode/app-store-connect-mcp-server"],
      "env": {
        "APP_STORE_CONNECT_ISSUER_ID": "your-issuer-id",
        "APP_STORE_CONNECT_KEY_ID": "your-key-id",
        "APP_STORE_CONNECT_PRIVATE_KEY_PATH": "/path/to/AuthKey_XXXXX.p8",
        "APP_STORE_CONNECT_VENDOR_NUMBER": "your-vendor-number"
      }
    }
  }
}
```

### 3. Configure for Claude Desktop

Add to Claude Desktop config:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "app-store-connect": {
      "command": "npx",
      "args": ["-y", "@shincode/app-store-connect-mcp-server"],
      "env": {
        "APP_STORE_CONNECT_ISSUER_ID": "your-issuer-id",
        "APP_STORE_CONNECT_KEY_ID": "your-key-id",
        "APP_STORE_CONNECT_PRIVATE_KEY_PATH": "/path/to/AuthKey_XXXXX.p8",
        "APP_STORE_CONNECT_VENDOR_NUMBER": "your-vendor-number"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_STORE_CONNECT_ISSUER_ID` | Your Issuer ID from App Store Connect | ✅ |
| `APP_STORE_CONNECT_KEY_ID` | Your API Key ID | ✅ |
| `APP_STORE_CONNECT_PRIVATE_KEY_PATH` | Path to your .p8 private key file | ✅* |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Private key content (alternative to path) | ✅* |
| `APP_STORE_CONNECT_VENDOR_NUMBER` | Vendor number for sales reports | For sales |

\* Either `PRIVATE_KEY_PATH` or `PRIVATE_KEY` is required

## Usage Examples

Once configured, you can ask:

```
"List all my apps"
"Show me the latest reviews for MyApp"
"Analyze review sentiment for my app"
"Get yesterday's sales report"
"Show performance metrics for my app"
"List beta testers"
```

## Development

```bash
# Clone the repository
git clone https://github.com/Shin-sibainu/app-store-connect-mcp-server.git
cd app-store-connect-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT

## Links

- [App Store Connect API Documentation](https://developer.apple.com/documentation/appstoreconnectapi)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

# 日本語

App Store Connect APIを利用して、iOSアプリの分析・管理を行うためのMCPサーバーです。CursorやClaude Desktopから直接アプリのパフォーマンス、売上、レビューなどを分析できます。

## 機能

### 📱 アプリ管理
- アプリ一覧の取得
- アプリの詳細情報
- バージョン履歴
- ビルド管理

### ⭐ レビュー
- カスタマーレビューの取得
- レビューへの返信・削除
- レビューの感情分析・評価分布

### 💰 売上/財務レポート
- 日次/週次/月次/年次の売上レポート
- 地域別財務レポート
- ダウンロード数・収益の確認

### 📊 Analytics
- インプレッション数（App Storeでの表示回数）
- プロダクトページビュー
- セッション数
- インストール/削除数

### 🔧 パフォーマンス・診断
- CPU/メモリ/バッテリー使用量
- クラッシュログ
- 診断シグネチャ

### 🧪 TestFlight
- ベータテスターの管理
- テスターの招待・削除
- テストグループの作成

## インストール

```bash
npm install -g @shincode/app-store-connect-mcp-server
```

または npx で直接実行：

```bash
npx @shincode/app-store-connect-mcp-server
```

## セットアップ

### 1. App Store Connect で API キーを取得

1. [App Store Connect](https://appstoreconnect.apple.com/) にアクセス
2. **ユーザーとアクセス** → **キー** → **App Store Connect API** に移動
3. **キーを生成** をクリック
4. `.p8` ファイルをダウンロード（⚠️ 一度しかダウンロードできません！）
5. **Issuer ID** と **キー ID** をメモ

### 2. Cursor での設定

`~/.cursor/mcp.json`（Windows: `%USERPROFILE%\.cursor\mcp.json`）に以下を追加：

```json
{
  "mcpServers": {
    "app-store-connect": {
      "command": "npx",
      "args": ["-y", "@shincode/app-store-connect-mcp-server"],
      "env": {
        "APP_STORE_CONNECT_ISSUER_ID": "あなたのIssuer ID",
        "APP_STORE_CONNECT_KEY_ID": "あなたのKey ID",
        "APP_STORE_CONNECT_PRIVATE_KEY_PATH": "/path/to/AuthKey_XXXXX.p8",
        "APP_STORE_CONNECT_VENDOR_NUMBER": "あなたのVendor Number"
      }
    }
  }
}
```

### 3. Claude Desktop での設定

設定ファイルの場所：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "app-store-connect": {
      "command": "npx",
      "args": ["-y", "@shincode/app-store-connect-mcp-server"],
      "env": {
        "APP_STORE_CONNECT_ISSUER_ID": "あなたのIssuer ID",
        "APP_STORE_CONNECT_KEY_ID": "あなたのKey ID",
        "APP_STORE_CONNECT_PRIVATE_KEY_PATH": "/path/to/AuthKey_XXXXX.p8",
        "APP_STORE_CONNECT_VENDOR_NUMBER": "あなたのVendor Number"
      }
    }
  }
}
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect の Issuer ID | ✅ |
| `APP_STORE_CONNECT_KEY_ID` | API キー ID | ✅ |
| `APP_STORE_CONNECT_PRIVATE_KEY_PATH` | .p8 秘密鍵ファイルのパス | ✅* |
| `APP_STORE_CONNECT_PRIVATE_KEY` | 秘密鍵の内容（パスの代わり） | ✅* |
| `APP_STORE_CONNECT_VENDOR_NUMBER` | 売上レポート用のベンダー番号 | 売上用 |

\* `PRIVATE_KEY_PATH` または `PRIVATE_KEY` のいずれかが必要

## 使用例

設定完了後、以下のように質問できます：

```
「自分のアプリの一覧を表示して」
「最新のカスタマーレビューを見せて」
「レビューの傾向を分析して」
「昨日の売上レポートを取得して」
「先月の売上を分析して」
「ベータテスター一覧を表示して」
「アプリのパフォーマンスを確認して」
```

## ライセンス

MIT
