export type LineIdentityMode = "manual" | "liff";

function resolveLineIdentityMode(value: string | undefined): LineIdentityMode {
  if (value === "liff") {
    return "liff";
  }

  return "manual";
}

export const publicEnv = {
  NEXT_PUBLIC_LINE_IDENTITY_MODE: resolveLineIdentityMode(process.env.NEXT_PUBLIC_LINE_IDENTITY_MODE),
  NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID ?? ""
};
