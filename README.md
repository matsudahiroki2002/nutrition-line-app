# Nutrition LINE PoC (MVP)

チラシ流入後の `シリアル認証 -> 診断結果提示 -> 購入導線` を検証するMVPです。

## 1. MVPスコープ

### 作る範囲
- 入口画面
- シリアル入力画面
- 結果画面（成功 / 無効 / 使用済み / エラー）
- シリアル認証API（Firestore連携）
- `users` / `users/{userId}/serials` / `authLogs` への保存
- LIFFでLINE User IDを取得してMessaging APIで通知送信
- seedスクリプト

### 作らない範囲
- 管理画面
- 決済連携

## 2. LINE運用前提

- 実運用のLINE公式アカウント（Messaging API / LIFF）を利用する前提です。
- クライアントはLIFFでLINE User IDを取得し、手入力フォールバックはありません。
- サーバはLINE Messaging APIへ直接送信します（mock送信はありません）。

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
│   │       └── lineService.ts
│   └── usecases/verifySerialUseCase.ts
├── .env.example
└── README.md
```

## 5. Firestoreデータ設計

### collection: `users`
- document id: `{userId}` (`lineUserId` を利用)
- fields:
  - `lineUserId: string`
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
  - `lineSendStatus: "sent" | "skipped" | "failed"`
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

## 7. 環境変数

`.env.example` を `.env.local` にコピーして設定:

```bash
cp .env.example .env.local
```

必須:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `NEXT_PUBLIC_LIFF_ID`

任意:
- `APP_BASE_URL`
- `LINE_API_BASE_URL`
- `PURCHASE_LINK_DEFAULT`
- `IMAGE_PLACEHOLDER_URL`

## 8. 起動手順

```bash
npm install
npm run seed
npm run dev
```

## 9. seedデータ投入

`data/seedSerials.json` を編集して投入:

```bash
npm run seed
```

## 10. 最低限のテスト観点

- LIFFでLINE User IDが取得でき、送信リクエストに含まれる
- 有効シリアルで `success`
- 無効シリアルで `invalid`
- 使用済みシリアルで `used`
- 送信失敗で `error` + `lineSendStatus=failed`
- `authLogs` に `lineErrorCode` / `lineRequestId` が保存される
