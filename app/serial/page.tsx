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

  const [name, setName] = useState("");
  const [serialCode, setSerialCode] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [identityLoading, setIdentityLoading] = useState(true);
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveIdentity() {
      const result = await identityService.resolveLineUserId();

      if (!active) {
        return;
      }

      setIdentityLoading(false);
      setIdentityMessage(result.lineUserId ? null : (result.message ?? null));

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

    if (!name.trim()) {
      setErrorMessage("漢字氏名を入力してください。");
      return;
    }

    if (!lineUserId.trim()) {
      setErrorMessage("LINEユーザー情報を取得できていません。LINEアプリ内で開き直して再試行してください。");
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
          lineUserId,
          name
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
        <h2>認証情報を入力してください</h2>
        <p>漢字氏名と、チラシに記載されたシリアルIDを入力してください。</p>

        <form className="stack" onSubmit={onSubmit}>
          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="name">漢字氏名</label>
            <input
              id="name"
              className="input"
              placeholder="例: 松田太郎"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </div>

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

          {identityLoading && <p className="subtle">LINE連携を確認中です...</p>}
          {identityMessage && <p className="status danger">{identityMessage}</p>}
          {errorMessage && <p className="status danger">{errorMessage}</p>}

          <button type="submit" className="button" disabled={submitting || identityLoading}>
            {submitting ? "認証中..." : "認証して結果を確認する"}
          </button>
        </form>
      </div>
    </main>
  );
}
