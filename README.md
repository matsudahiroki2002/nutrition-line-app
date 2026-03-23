# Nutrition LINE PoC (MVP)

`氏名 + シリアルID` を認証キーにして、LINE通知と結果閲覧を検証するMVPです。

## 1. MVPスコープ

### 作る範囲
- 入口画面
- シリアル入力画面
- 結果画面（成功時）
- シリアル認証API（Firestore連携）
- `reports` への保存とフラグ更新
- LIFFでLINE User IDを取得し、Messaging APIで通知送信
- seedスクリプト

### 作らない範囲
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
│   ├── api
│   │   ├── reports/[reportId]/events/route.ts
│   │   └── serial/verify/route.ts
│   ├── result/[reportId]/page.tsx
│   ├── serial/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── not-found.tsx
├── data/seedReports.json
├── scripts/seedReports.ts
├── src
│   ├── components/reportResultActions.tsx
│   ├── domain/types.ts
│   ├── lib
│   │   ├── env.ts
│   │   ├── firebaseAdmin.ts
│   │   └── publicEnv.ts
│   ├── repositories/reportRepository.ts
│   ├── services
│   │   ├── identity/lineIdentityService.ts
│   │   └── line
│   │       ├── index.ts
│   │       ├── lineMessagingApiService.ts
│   │       └── lineService.ts
│   └── usecases/verifySerialUseCase.ts
└── README.md
```

## 4. Firestoreデータ設計

### collection: `reports`
- document id: auto (Firestore generated)
- fields:
  - `createdAt: Timestamp`
  - `birthday: string` (`YYYY-MM-DD`)
  - `userName: string`
  - `serialId: string` (英大小文字 + 数字の6文字)
  - `purchaseUrl: string`
  - `storagePath: string`
  - `resultPdfUrl: string`
  - `lineRegistrationFlag: boolean`
  - `pdfSendFlag: boolean`
  - `lineUserId: string | null`
  - `pdfClickedFlag: boolean`
  - `urlClickedFlag: boolean`
  - `updatedAt: Timestamp`

### 認証ルール
- `userName + serialId` をキーに検索。
- 0件: `invalid`
- 2件以上: `error`（データ不整合）
- 1件:
  - `lineUserId` 未登録なら初回紐付け
  - 既登録かつ別 `lineUserId` なら `invalid`
  - 同一 `lineUserId` なら許可

同じLINEアカウントによる複数チラシ確認は許容されます。

## 5. API設計

### `POST /api/serial/verify`
- request:
  - `userName: string` (required)
  - `serialId: string` (required, `/^[A-Za-z0-9]{6}$/`)
  - `lineUserId: string` (required)
- response:
  - success: `{ ok: true, result: "success", reportId: string, message: string }`
  - error: `{ ok: false, result: "invalid" | "error", message: string, reportId?: string }`

### `POST /api/reports/{reportId}/events`
- request:
  - `event: "pdf_clicked" | "url_clicked"`
- effect:
  - `pdf_clicked` -> `pdfClickedFlag = true`
  - `url_clicked` -> `urlClickedFlag = true`

## 6. 環境変数

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

補足:
- LINE の通知画像とリンク導線には、`APP_BASE_URL` が外部公開された `https://...` である必要があります。

## 7. 起動手順

```bash
npm install
npm run seed
npm run dev
```

## 8. seedデータ投入

`reports` を投入:

```bash
npm run seed
```

個別実行:

```bash
npm run seed:reports
```
