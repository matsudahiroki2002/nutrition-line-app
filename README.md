# Nutrition LINE PoC (MVP)

チラシ流入後の `シリアル認証 -> 診断結果提示 -> 購入導線` を検証するMVPです。

## 1. MVPスコープ

### 作る範囲
- 入口画面
- シリアル入力画面
- 結果画面（成功 / 無効 / 使用済み / エラー）
- シリアル認証API（Firestore連携）
- `users` / `users/{userId}/serials` / `authLogs` への保存
- LINE送信モック（差し替え前提）
- LINE識別モード（手入力 / LIFF）切替
- seedスクリプト

### 作らない範囲
- LINE Messaging API本番接続
- LIFFの本番審査/運用設定
- 管理画面
- 決済連携

## 2. 技術構成

- Next.js (App Router)
- TypeScript
- Firebase Admin SDK (Firestore)
- Zod

## 3. ディレクトリ構成

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
│   │       ├── lineService.ts
│   │       └── mockLineService.ts
│   └── usecases/verifySerialUseCase.ts
├── .env.example
└── README.md
```

## 4. Firestoreデータ設計

### collection: `users`
- document id: `{userId}` (`lineUserId` を利用)
- fields:
  - `lineUserId: string`
  - `lineAccountKey: string` (`temp` / `prod` など)
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
  - `lineSendStatus: "mock_sent" | "skipped" | "failed"`
  - `createdAt: Timestamp`

## 5. API設計

### `POST /api/serial/verify`
- request:
  - `serialCode: string` (required)
  - `lineUserId: string` (required)
- response:
  - success: `{ ok: true, logId: string }`
  - error: `{ ok: false, message: string }`

## 6. レイヤ設計

- UI層: `app/*`
- ビジネスロジック層: `src/usecases/*`
- データアクセス層: `src/repositories/*`
- 外部連携層: `src/services/line/*`
- 識別取得層（クライアント）: `src/services/identity/*`

## 7. 将来差し替えを楽にする切替ポイント

### A. LIFF切替（入力UI側）
- `NEXT_PUBLIC_LINE_IDENTITY_MODE=manual|liff`
- `NEXT_PUBLIC_LIFF_ID=<your liff id>`
- 実装: `src/services/identity/lineIdentityService.ts`

### B. LINE送信切替（サーバ側）
- `LINE_SERVICE_MODE=mock|line`
- 実装: `src/services/line/index.ts`

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

1. `src/services/line/lineService.ts` のIFを満たす本番実装を追加
2. `src/services/line/index.ts` で `LINE_SERVICE_MODE=line` の返却先を本番実装へ変更
3. `.env.local` の `LINE_SERVICE_MODE` を `line` に変更
4. `NEXT_PUBLIC_LINE_IDENTITY_MODE=liff` と `NEXT_PUBLIC_LIFF_ID` を設定
5. `LINE_ACCOUNT_KEY=prod` に切り替え

## 12. 最低限のテスト観点

- `manual` モードで手入力IDが送信される
- `liff` モードで取得成功時に手入力なしで送信できる
- `liff` 失敗時に手入力へフォールバックできる
- 有効シリアルで `success`
- 無効シリアルで `invalid`
- 使用済みシリアルで `used`
- 送信モック失敗で `error` + `lineSendStatus=failed`
- `users/{userId}.lineAccountKey` が保存される
