"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLineIdentityService } from "@/src/services/identity/lineIdentityService";

type VerifyApiResponse = {
  ok: boolean;
  logId?: string;
  message?: string;
};

export default function SerialPage() {
  const router = useRouter();
  const identityService = useMemo(() => createLineIdentityService(), []);

  const [serialCode, setSerialCode] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [requiresManualInput, setRequiresManualInput] = useState(identityService.mode === "manual");
  const [identityLoading, setIdentityLoading] = useState(identityService.mode === "liff");
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveIdentity() {
      if (identityService.mode === "manual") {
        setIdentityLoading(false);
        setRequiresManualInput(true);
        return;
      }

      const result = await identityService.resolveLineUserId();

      if (!active) {
        return;
      }

      setRequiresManualInput(result.requiresManualInput);
      setIdentityLoading(false);
      setIdentityMessage(result.message ?? null);

      if (result.lineUserId) {
        setLineUserId(result.lineUserId);
      }
    }

    void resolveIdentity();

    return () => {
      active = false;
    };
  }, [identityService]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!serialCode.trim()) {
      setErrorMessage("シリアルIDを入力してください。");
      return;
    }

    if (!lineUserId.trim()) {
      setErrorMessage(
        requiresManualInput
          ? "LINE User IDを入力してください。"
          : "LINEユーザー情報を取得中です。少し待ってから再試行してください。"
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/serial/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serialCode,
          lineUserId
        })
      });

      const data = (await response.json()) as VerifyApiResponse;

      if (!response.ok || !data.ok || !data.logId) {
        throw new Error(data.message ?? "認証処理に失敗しました。");
      }

      router.push(`/result/${data.logId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "通信エラーが発生しました。";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="main">
      <div className="card stack">
        <span className="badge">Step 1</span>
        <h2>シリアルIDを入力してください</h2>
        <p>チラシの英数字をそのまま入力してください。入力後に認証を行います。</p>

        <form className="stack" onSubmit={onSubmit}>
          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="serialCode">シリアルID</label>
            <input
              id="serialCode"
              className="input"
              placeholder="例: NUTR-2026-0001"
              value={serialCode}
              onChange={(event) => setSerialCode(event.target.value)}
              autoCapitalize="characters"
            />
          </div>

          {requiresManualInput ? (
            <div className="stack" style={{ gap: 8 }}>
              <label htmlFor="lineUserId">LINE User ID</label>
              <input
                id="lineUserId"
                className="input"
                placeholder="例: Uxxxxxxxx"
                value={lineUserId}
                onChange={(event) => setLineUserId(event.target.value)}
              />
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              <label>LINE User ID（LIFF取得）</label>
              <input className="input" value={lineUserId} readOnly />
            </div>
          )}

          {identityLoading && <p className="subtle">LIFF連携を初期化中です...</p>}
          {identityMessage && <p className="subtle">{identityMessage}</p>}
          {errorMessage && <p className="status danger">{errorMessage}</p>}

          <button type="submit" className="button" disabled={submitting || identityLoading}>
            {submitting ? "認証中..." : "認証して結果を受け取る"}
          </button>
        </form>

        <p className="subtle">
          将来の本番切替は、環境変数で `manual` と `liff` を切り替えるだけで適用できます。
        </p>
      </div>
    </main>
  );
}
