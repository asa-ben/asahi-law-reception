# さくらVPS（asahi-l.com）全アプリ構成 引き継ぎドキュメント

> **最終更新**: 2026-04-26  
> **対象VPS**: 49.212.205.24（さくらインターネット VPS）  
> **ドメイン**: asahi-l.com（Let's Encrypt SSL証明書取得済み）

---

## 1. VPSアクセス情報

| 項目 | 値 |
|------|-----|
| IPアドレス | 49.212.205.24 |
| ドメイン | asahi-l.com |
| SSHユーザー | ubuntu |
| SSHパスワード | asahi3511 |
| OS | Ubuntu 22.04 LTS |

**SSH接続コマンド例:**
```bash
sshpass -p 'asahi3511' ssh -o StrictHostKeyChecking=no ubuntu@49.212.205.24
```

---

## 2. VPS上のアプリ一覧

| PM2 ID | アプリ名 | ディレクトリ | ポート | アクセスURL |
|--------|---------|------------|--------|------------|
| 8 | asahi-law | /home/ubuntu/asahi-law-app/ | 3001 | https://asahi-l.com/uketsuke/ |
| 0 | law-firm-aptitude-test | /home/ubuntu/law-firm-aptitude-test/ | 3000 | http://49.212.205.24:3000/ |
| 7 | tekisei-app | /home/ubuntu/tekisei-app/ | 3002 | http://49.212.205.24:3002/ |
| - | mitsumori（静的） | /var/www/asahi-tools/mitsumori/ | - | https://asahi-l.com/mitsumori/ |
| - | youikuhi（静的） | /var/www/konin-yoiku-simulator/public/ | - | https://asahi-l.com/youikuhi/ |
| - | songai（静的） | /var/www/songai_keisan/public/ | - | https://asahi-l.com/songai/ |
| - | WordPress | /var/www/html/wordpress/ | - | https://asahi-l.com/wp/ |

---

## 3. メインアプリ: asahi-law（受付管理システム）

### 概要
朝日弁護士法人向けの依頼者登録・受付管理システム。依頼者自己入力→相談待機→PayPay QR表示→アンケートの一連フローを提供。

### 技術スタック
- **フロントエンド**: React 19 + Tailwind CSS 4 + shadcn/ui
- **バックエンド**: Express 4 + tRPC 11
- **データベース**: MySQL（ローカル） + Drizzle ORM
- **認証**: VPS専用パスワード認証（localAuth.ts）
- **プロセス管理**: PM2（クラスターモード、インスタンス1）

### ディレクトリ構造
```
/home/ubuntu/asahi-law-app/
├── client/              # Reactフロントエンド
│   └── src/
│       ├── pages/       # ページコンポーネント
│       ├── components/  # 共通コンポーネント
│       └── App.tsx      # ルーティング（basepath: /uketsuke/）
├── server/              # Expressバックエンド
│   ├── _core/
│   │   ├── index.ts     # サーバーエントリーポイント
│   │   ├── localAuth.ts # VPS専用パスワード認証
│   │   ├── env.ts       # 環境変数定義
│   │   └── cookies.ts   # セッションクッキー設定
│   ├── routers.ts       # tRPCルーター
│   └── db.ts            # DBクエリヘルパー
├── drizzle/
│   └── schema.ts        # DBスキーマ定義
├── dist/                # ビルド済みファイル（本番用）
│   ├── index.js         # サーバーバンドル
│   └── public/          # フロントエンドビルド
├── ecosystem.config.cjs # PM2設定
└── vite.config.ts       # Viteビルド設定（base: /uketsuke/）
```

### 環境変数（ecosystem.config.cjs）
```javascript
env: {
  NODE_ENV: 'production',
  PORT: '3001',
  DATABASE_URL: 'mysql://asahi:asahi3511@localhost:3306/asahi_law',
  JWT_SECRET: 'KiZNaTEqZ6m4kDPvvSuJ2L',
  VITE_APP_ID: 'bWMCToBMaWZYU8v22C5xF4',
  OAUTH_SERVER_URL: 'https://api.manus.im',
  USE_LOCAL_AUTH: 'true',
  ADMIN_PASSWORD: 'asahi3511',
  VITE_BASE_PATH: '/uketsuke/'
}
```

### 認証の仕組み
VPS環境では `USE_LOCAL_AUTH=true` により、Manus OAuthの代わりにパスワード認証を使用。

- **ログインURL**: https://asahi-l.com/uketsuke/login
- **初期パスワード**: asahi3511
- **パスワード変更**: https://asahi-l.com/uketsuke/settings（ログイン後）
- **APIエンドポイント**:
  - `POST /uketsuke/api/local-auth/login` — ログイン
  - `POST /uketsuke/api/local-auth/logout` — ログアウト
  - `POST /uketsuke/api/local-auth/change-password` — パスワード変更

### 主要ページ
| パス | 説明 |
|------|------|
| /uketsuke/login | ログインページ |
| /uketsuke/ | ダッシュボード（本日の受付・相談待ち等） |
| /uketsuke/intake | 受付管理（セッション一覧） |
| /uketsuke/tablet | タブレット受付モード（ログイン不要） |
| /uketsuke/settings | 設定（パスワード変更・SF OID・Google口コミURL） |

### データベース
- **DB名**: asahi_law
- **ユーザー**: asahi / asahi3511
- **主要テーブル**: users, intakeSessions, appSettings

### ビルドとデプロイ手順

**Manus sandbox上でのビルド:**
```bash
cd /home/ubuntu/asahi-law-app
VITE_BASE_PATH=/uketsuke/ VITE_USE_LOCAL_AUTH=true pnpm build
```

**VPSへのデプロイ（Manus sandbox → VPS）:**
```bash
# 1. ビルド済みdistをtar圧縮
tar -czf /tmp/asahi-law-dist.tar.gz -C /home/ubuntu/asahi-law-app dist

# 2. VPSに転送
sshpass -p 'asahi3511' scp -o StrictHostKeyChecking=no /tmp/asahi-law-dist.tar.gz ubuntu@49.212.205.24:/home/ubuntu/

# 3. VPS上で展開してPM2再起動
sshpass -p 'asahi3511' ssh -o StrictHostKeyChecking=no ubuntu@49.212.205.24 "
  cd /home/ubuntu/asahi-law-app
  tar -xzf /home/ubuntu/asahi-law-dist.tar.gz
  pm2 restart asahi-law
  pm2 save
"
```

**注意**: vite.config.tsの `base` は `/uketsuke/` にハードコードされている（VITE_BASE_PATH環境変数は参照していない）。

### GitHubリポジトリ
```
https://github.com/asa-ben/asahi-law-reception.git
```

---

## 4. 適性検査システム（law-firm-aptitude-test）

### 概要
弁護士事務所向け採用適性検査システム。候補者にURLを発行し、回答結果をJSONファイルに保存。

### 技術スタック
- **フロントエンド**: React + Vite
- **バックエンド**: Express（シンプル、DBなし）
- **データ保存**: JSONファイル（`server/data/results.json`）
- **プロセス管理**: PM2（フォークモード）

### 設定
```
ディレクトリ: /home/ubuntu/law-firm-aptitude-test/
ポート: 3000（環境変数PORT=3000）
PM2 ID: 0
```

### ecosystem.config.cjs
```javascript
{
  name: "law-firm-aptitude-test",
  cwd: "/home/ubuntu/law-firm-aptitude-test",
  script: "pnpm",
  args: "start",
  env: {
    NODE_ENV: "production",
    PORT: 3000,
  }
}
```

### APIエンドポイント
- `POST /api/results` — 回答結果を保存
- `GET /api/results` — 結果一覧取得

### ビルドとデプロイ
```bash
# VPS上でビルド
cd /home/ubuntu/law-firm-aptitude-test
pnpm install --no-frozen-lockfile
pnpm build
pm2 restart law-firm-aptitude-test
```

---

## 5. 適性検査システムv2（tekisei-app）

### 概要
適性検査システムの新バージョン。Manus tRPCスタックを使用し、メール送信機能あり。

### 技術スタック
- **フロントエンド**: React + Tailwind + shadcn/ui
- **バックエンド**: Express + tRPC
- **データベース**: MySQL（接続設定あり）
- **メール**: nodemailer（SMTP）
- **プロセス管理**: PM2（フォークモード）

### 設定
```
ディレクトリ: /home/ubuntu/tekisei-app/
ポート: 3002（自動検出、PORT環境変数なし → 3000が使用中のため3002を使用）
PM2 ID: 7
```

### ビルドとデプロイ
```bash
# VPS上でビルド
cd /home/ubuntu/tekisei-app
pnpm install --no-frozen-lockfile
pnpm build
pm2 restart tekisei-app
```

**注意**: tekisei-appはNginxを経由していない（直接ポート3002でアクセス）。Nginxの設定にtekisei-appのプロキシ設定は含まれていない。

---

## 6. 静的サイト群

### 弁護士報酬計算システム（mitsumori）
```
パス: https://asahi-l.com/mitsumori/
ファイル: /var/www/asahi-tools/mitsumori/
種類: 静的HTML/CSS/JS
```

### 養育費・婚姻費用シミュレーター（youikuhi）
```
パス: https://asahi-l.com/youikuhi/
ファイル: /var/www/konin-yoiku-simulator/public/
種類: 静的HTML/CSS/JS
デプロイ: /home/ubuntu/deploy-konin.sh を参照
```

### 損害賠償算定ツール（songai）
```
パス: https://asahi-l.com/songai/
ファイル: /var/www/songai_keisan/public/
種類: 静的HTML/CSS/JS
デプロイ: /home/ubuntu/deploy.sh を参照
```

---

## 7. Nginx設定

### 有効な設定ファイル
```
/etc/nginx/sites-enabled/asahi-tools → /etc/nginx/sites-available/asahi-tools
```

### 主要なルーティング
| リクエスト | 処理 |
|-----------|------|
| HTTP → HTTPS | 301リダイレクト |
| https://asahi-l.com/ | /uketsuke/ へ301リダイレクト |
| https://asahi-l.com/uketsuke/ | localhost:3001（asahi-law）へプロキシ |
| https://asahi-l.com/mitsumori/ | /var/www/asahi-tools/mitsumori/ から静的配信 |
| https://asahi-l.com/youikuhi/ | /var/www/konin-yoiku-simulator/public/ から静的配信 |
| https://asahi-l.com/songai/ | /var/www/songai_keisan/public/ から静的配信 |
| https://asahi-l.com/wp/ | WordPress（PHP-FPM）へ |

### Nginx設定ファイルの編集
```bash
# 設定ファイルを編集
sudo nano /etc/nginx/sites-available/asahi-tools

# 設定テスト
sudo nginx -t

# 設定を反映
sudo systemctl reload nginx
```

---

## 8. PM2管理コマンド

```bash
# プロセス一覧
pm2 list

# 特定アプリを再起動
pm2 restart asahi-law
pm2 restart law-firm-aptitude-test
pm2 restart tekisei-app

# ログ確認
pm2 logs asahi-law --lines 50
pm2 logs law-firm-aptitude-test --lines 50

# 現在の状態を保存（再起動後も自動起動）
pm2 save

# 自動起動設定（初回のみ）
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## 9. データベース管理

```bash
# MySQLに接続
mysql -u asahi -pasahi3511 asahi_law

# テーブル一覧
SHOW TABLES;

# intakeSessionsの最新10件
SELECT * FROM intakeSessions ORDER BY createdAt DESC LIMIT 10;

# パスワード変更（ecosystem.config.cjsも更新すること）
UPDATE appSettings SET value='新パスワード' WHERE key='adminPassword';
```

---

## 10. SSL証明書の更新

```bash
# Let's Encrypt証明書の更新（自動更新が設定済み）
sudo certbot renew --dry-run

# 手動更新
sudo certbot renew
sudo systemctl reload nginx
```

---

## 11. Claude/AIによる修正時の注意事項

### asahi-law-appを修正する場合

1. **Manus sandboxで修正**: `/home/ubuntu/asahi-law-app/` でコードを編集
2. **ビルド**: `VITE_BASE_PATH=/uketsuke/ VITE_USE_LOCAL_AUTH=true pnpm build`
3. **VPSへデプロイ**: 上記「ビルドとデプロイ手順」を参照
4. **PM2再起動**: `pm2 restart asahi-law && pm2 save`

### 重要な設定ファイル
- `vite.config.ts`: `base: "/uketsuke/"` がハードコード（変更不要）
- `ecosystem.config.cjs`: 環境変数（USE_LOCAL_AUTH, ADMIN_PASSWORD等）
- `server/_core/localAuth.ts`: VPS専用パスワード認証の実装（distにバンドル済み）

### よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| ログインできない | パスワード不一致 | ecosystem.config.cjsのADMIN_PASSWORDを確認 |
| 白画面 | ビルドエラーまたは環境変数未設定 | pm2 logs asahi-lawでエラー確認 |
| APIエラー | PM2プロセスが停止 | pm2 restart asahi-law |
| DB接続エラー | MySQLが停止 | sudo systemctl start mysql |

---

## 12. バックアップ

```bash
# DBバックアップ
mysqldump -u asahi -pasahi3511 asahi_law > /home/ubuntu/backup_$(date +%Y%m%d).sql

# アプリバックアップ
tar -czf /home/ubuntu/asahi-law-backup-$(date +%Y%m%d).tar.gz /home/ubuntu/asahi-law-app/dist /home/ubuntu/asahi-law-app/ecosystem.config.cjs
```
