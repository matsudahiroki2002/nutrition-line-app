import { publicEnv } from "@/src/lib/publicEnv";

export type ResolveLineIdentityResult = {
  lineUserId: string | null;
  displayName: string | null;
  message?: string;
};

export interface LineIdentityService {
  resolveLineUserId(): Promise<ResolveLineIdentityResult>;
}

type LiffProfile = {
  userId: string;
  displayName?: string;
};

type LiffSdk = {
  init: (input: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  isInClient?: () => boolean;
  login: (input?: { redirectUri?: string }) => void;
  getProfile: () => Promise<LiffProfile>;
  closeWindow?: () => void;
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

class LiffLineIdentityService implements LineIdentityService {
  constructor(private readonly liffId: string) {}

  async resolveLineUserId(): Promise<ResolveLineIdentityResult> {
    if (!this.liffId) {
      return {
        lineUserId: null,
        displayName: null,
        message: "現在このページを利用できません。時間をおいて再度お試しください。"
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
          displayName: null,
          message: undefined
        };
      }

      const profile = await window.liff.getProfile();

      return {
        lineUserId: profile.userId,
        displayName: profile.displayName ?? null,
        message: undefined
      };
    } catch (_error) {
      return {
        lineUserId: null,
        displayName: null,
        message: "LIFF連携に失敗しました。LINEアプリ内でページを開き直してください。"
      };
    }
  }
}

export function createLineIdentityService(): LineIdentityService {
  return new LiffLineIdentityService(publicEnv.NEXT_PUBLIC_LIFF_ID);
}

export function closeLiffWindowIfPossible(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const liff = window.liff;
  const closeWindow = liff?.closeWindow;

  if (!liff || typeof closeWindow !== "function") {
    return false;
  }

  if (typeof liff.isInClient === "function" && !liff.isInClient()) {
    return false;
  }

  try {
    closeWindow();
    return true;
  } catch {
    return false;
  }
}
