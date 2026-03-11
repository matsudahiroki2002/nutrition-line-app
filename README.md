# Nutrition LINE PoC (MVP)

チラシ流入後の `シリアル認証 -> 診断結果提示 -> 購入導線` を検証するMVPです。

## 1. MVPスコープ

### 作る範囲
- 入口画面
- シリアル入力画面
- 結果画面（成功 / 無効 / 使用済み / エラー）
- シリアル認証API（Firestore連携）
- `users` / `users/{userId}/serials` / `authLogs` への保存
- LINE送信の `mock` / `line` 切替
- LINE識別モード（手入力 / LIFF）切替
- seedスクリプト

### 作らない範囲
- 管理画面
- 決済連携

## 2. LINE運用前提

- 「仮LINEアカウント」は、**個人のLINEアカウントで発行した正式なLINE公式アカウント（検証用チャネル）** を意味します。
- 本番切替時は、法人/本番チャネルに差し替える前提です。
- 差し替えを容易にするため、`LINE_SERVICE_MODE` / `NEXT_PUBLIC_LINE_IDENTITY_MODE` / `LINE_ACCOUNT_KEY` を環境変数で切り替える設計にしています。

## 3. 技術構成

- Next.js (App Router)
- TypeScript
- Firebase Admin SDK (Firestore)
- Zod

## 4. ディレクトリ構成

```text
.
├── app
│   ├── api/serial/verify/route.ts
│   ├── result/[logId]/page.tsx
│   ├── serial/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── not-found.tsx
├── data/seedSerials.json
├── scripts/seedSerials.ts
├── src
│   ├── domain/types.ts
│   ├── lib
│   │   ├── env.ts
│   │   ├── firebaseAdmin.ts
│   │   └── publicEnv.ts
│   ├── repositories
│   │   ├── authLogRepository.ts
│   │   ├── serialRepository.ts
│   │   └── userRepository.ts
│   ├── services
│   │   ├── identity/lineIdentityService.ts
│   │   └── line
│   │       ├── index.ts
│   │       ├── lineMessagingApiService.ts
│   │       ├── lineService.ts
│   │       └── mockLineService.ts
│   └── usecases/verifySerialUseCase.ts
├── .env.example
└── README.md
```

## 5. Firestoreデータ設計

### collection: `users`
- document id: `{userId}` (`lineUserId` を利用)
- fields:
  - `lineUserId: string`
  - `lineAccountKey: string` (`temp` / `prod`)
  - `displayName: string | null`
  - `status: "active"`
  - `createdAt: Timestamp`
  - `updatedAt: Timestamp`

### subcollection: `users/{userId}/serials`
- document id: `{serialCode}`
- fields:
  - `serialCode: string`
  - `status: "unused" | "used" | "invalid"`
  - `resultImageUrl: string`
  - `purchaseLink: string`
  - `usedAt: Timestamp | null`
  - `createdAt: Timestamp`
  - `updatedAt: Timestamp`

### collection: `authLogs`
- document id: auto
- fields:
  - `userId: string`
  - `serialCode: string`
  - `result: "success" | "invalid" | "used" | "error"`
  - `message: string`
  - `lineSendStatus: "mock_sent" | "sent" | "skipped" | "failed"`
  - `lineErrorCode: string | null`
  - `lineRequestId: string | null`
  - `createdAt: Timestamp`

## 6. API設計

### `POST /api/serial/verify`
- request:
  - `serialCode: string` (required)
  - `lineUserId: string` (required)
- response:
  - success: `{ ok: true, logId: string }`
  - error: `{ ok: false, message: string }`

## 7. 主要切替ポイント

### A. LIFF切替（入力UI側）
- `NEXT_PUBLIC_LINE_IDENTITY_MODE=manual|liff`
- `NEXT_PUBLIC_LIFF_ID=<liff id>`
- 実装: `src/services/identity/lineIdentityService.ts`

### B. LINE送信切替（サーバ側）
- `LINE_SERVICE_MODE=mock|line`
- 実装: `src/services/line/index.ts`
- `line` 時は `src/services/line/lineMessagingApiService.ts` を使用

### C. LINEアカウント系統切替（データ識別）
- `LINE_ACCOUNT_KEY=temp|prod`
- 保存先: `users/{userId}.lineAccountKey`

## 8. 環境変数

`.env.example` を `.env.local` にコピーして設定:

```bash
cp .env.example .env.local
```

必須:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

`LINE_SERVICE_MODE=line` の場合必須:
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`

MVP運用で重要:
- `NEXT_PUBLIC_LINE_IDENTITY_MODE`
- `LINE_SERVICE_MODE`
- `LINE_ACCOUNT_KEY`

## 9. 起動手順

> この実行環境では Node/npm が未インストールのため、実行検証は未実施です。

```bash
npm install
npm run seed
npm run dev
```

## 10. seedデータ投入

`data/seedSerials.json` を編集して投入:

```bash
npm run seed
```

## 11. 本番LINE差し替え手順

1. 本番チャネル（Messaging API / LIFF）を作成
2. `.env.local` を本番値へ更新
3. `LINE_SERVICE_MODE=line` へ変更
4. `NEXT_PUBLIC_LINE_IDENTITY_MODE=liff` と `NEXT_PUBLIC_LIFF_ID` を設定
5. `LINE_ACCOUNT_KEY=prod` へ変更
6. スモークテスト後に公開導線を本番へ切替

## 12. 最低限のテスト観点

- `manual` モードで手入力IDが送信される
- `liff` モードで取得成功時に手入力なしで送信できる
- `liff` 失敗時に手入力へフォールバックできる
- 有効シリアルで `success`
- 無効シリアルで `invalid`
- 使用済みシリアルで `used`
- 送信失敗で `error` + `lineSendStatus=failed`
- `authLogs` に `lineErrorCode` / `lineRequestId` が保存される
