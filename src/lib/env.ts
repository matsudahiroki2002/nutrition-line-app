import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
  LINE_API_BASE_URL: z.string().url().default("https://api.line.me"),
  PURCHASE_LINK_DEFAULT: z.string().url().optional(),
  IMAGE_PLACEHOLDER_URL: z.string().url().optional()
});

/** 空文字列を undefined に変換する（process.env は未設定でも "" を返す場合がある） */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

type Env = z.infer<typeof envSchema> & { FIREBASE_PRIVATE_KEY: string };

let cached: Env | null = null;

function loadEnv(): Env {
  if (cached) {
    return cached;
  }

  const parsedEnv = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    APP_BASE_URL: emptyToUndefined(process.env.APP_BASE_URL),
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    LINE_API_BASE_URL: emptyToUndefined(process.env.LINE_API_BASE_URL),
    PURCHASE_LINK_DEFAULT: emptyToUndefined(process.env.PURCHASE_LINK_DEFAULT),
    IMAGE_PLACEHOLDER_URL: emptyToUndefined(process.env.IMAGE_PLACEHOLDER_URL)
  });

  if (!parsedEnv.success) {
    const issues = parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  cached = {
    ...parsedEnv.data,
    FIREBASE_PRIVATE_KEY: parsedEnv.data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  };

  return cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env];
  }
});
