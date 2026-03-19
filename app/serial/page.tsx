"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { closeLiffWindowIfPossible, createLineIdentityService } from "@/src/services/identity/lineIdentityService";

type VerifyApiResponse = {
  ok: boolean;
  reportId?: string;
  result?: "success" | "invalid" | "error";
  message?: string;
};

export default function SerialPage() {
  const router = useRouter();
  const identityService = useMemo(() => createLineIdentityService(), []);

  const [userName, setUserName] = useState("");
  const [serialId, setSerialId] = useState("");
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

    if (!serialId.trim()) {
      setErrorMessage("シリアルIDを入力してください。");
      return;
    }

    if (!/^[A-Za-z0-9]{6}$/.test(serialId.trim())) {
      setErrorMessage("シリアルIDは英数字6文字で入力してください。");
      return;
    }

    if (!userName.trim()) {
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
          serialId,
          lineUserId,
          userName
        })
      });

      const data = (await response.json()) as VerifyApiResponse;

      if (!response.ok || !data.ok || !data.result) {
        throw new Error(data.message ?? "認証処理に失敗しました。");
      }

      if (data.result === "success" && closeLiffWindowIfPossible()) {
        return;
      }

      if (!data.reportId) {
        throw new Error("認証には成功しましたが、表示対象データが見つかりません。");
      }

      router.push(`/result/${data.reportId}`);
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
              placeholder="例: 佐藤太郎"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="serialId">シリアルID</label>
            <input
              id="serialId"
              className="input"
              placeholder="例: A1b2C3"
              value={serialId}
              onChange={(event) => setSerialId(event.target.value)}
              autoCapitalize="none"
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
