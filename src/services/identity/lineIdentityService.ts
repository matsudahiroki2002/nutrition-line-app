import { publicEnv, type LineIdentityMode } from "@/src/lib/publicEnv";

export type ResolveLineIdentityResult = {
  lineUserId: string | null;
  requiresManualInput: boolean;
  message?: string;
};

export interface LineIdentityService {
  mode: LineIdentityMode;
  resolveLineUserId(currentInput?: string): Promise<ResolveLineIdentityResult>;
}

type LiffProfile = {
  userId: string;
};

type LiffSdk = {
  init: (input: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (input?: { redirectUri?: string }) => void;
  getProfile: () => Promise<LiffProfile>;
};

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

let liffLoadPromise: Promise<void> | null = null;

function loadLiffSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not available"));
  }

  if (window.liff) {
    return Promise.resolve();
  }

  if (liffLoadPromise) {
    return liffLoadPromise;
  }

  liffLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${LIFF_SDK_URL}"]`);

    if (existingScript) {
      if (window.liff) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("LIFF SDK load error")), { once: true });
      setTimeout(() => {
        if (window.liff) {
          resolve();
          return;
        }
        reject(new Error("LIFF SDK load timeout"));
      }, 3000);
      return;
    }

    const script = document.createElement("script");
    script.src = LIFF_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LIFF SDK load error"));
    document.head.appendChild(script);
  });

  return liffLoadPromise;
}

class ManualLineIdentityService implements LineIdentityService {
  mode: LineIdentityMode = "manual";

  async resolveLineUserId(currentInput?: string): Promise<ResolveLineIdentityResult> {
    const normalized = currentInput?.trim() || null;

    return {
      lineUserId: normalized,
      requiresManualInput: true
    };
  }
}

class LiffLineIdentityService implements LineIdentityService {
  mode: LineIdentityMode = "liff";

  constructor(private readonly liffId: string) {}

  async resolveLineUserId(): Promise<ResolveLineIdentityResult> {
    if (!this.liffId) {
      return {
        lineUserId: null,
        requiresManualInput: true,
        message: "LIFF IDが未設定のため手入力モードにフォールバックしました。"
      };
    }

    try {
      await loadLiffSdk();

      if (!window.liff) {
        throw new Error("LIFF SDK is not available");
      }

      await window.liff.init({ liffId: this.liffId });

      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return {
          lineUserId: null,
          requiresManualInput: false,
          message: "LINEログインへ遷移しています。"
        };
      }

      const profile = await window.liff.getProfile();

      return {
        lineUserId: profile.userId,
        requiresManualInput: false,
        message: "LIFFからLINEユーザー情報を取得しました。"
      };
    } catch (_error) {
      return {
        lineUserId: null,
        requiresManualInput: true,
        message: "LIFF連携に失敗したため手入力モードに切り替えました。"
      };
    }
  }
}

export function createLineIdentityService(): LineIdentityService {
  if (publicEnv.NEXT_PUBLIC_LINE_IDENTITY_MODE === "liff") {
    return new LiffLineIdentityService(publicEnv.NEXT_PUBLIC_LIFF_ID);
  }

  return new ManualLineIdentityService();
}
