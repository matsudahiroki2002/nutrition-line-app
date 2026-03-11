import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  LINE_SERVICE_MODE: z.enum(["mock", "line"]).default("mock"),
  LINE_ACCOUNT_KEY: z.string().min(1).default("temp"),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_API_BASE_URL: z.string().url().default("https://api.line.me"),
  PURCHASE_LINK_DEFAULT: z.string().url().optional(),
  IMAGE_PLACEHOLDER_URL: z.string().url().optional()
});

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  APP_BASE_URL: process.env.APP_BASE_URL,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  LINE_SERVICE_MODE: process.env.LINE_SERVICE_MODE,
  LINE_ACCOUNT_KEY: process.env.LINE_ACCOUNT_KEY,
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  LINE_API_BASE_URL: process.env.LINE_API_BASE_URL,
  PURCHASE_LINK_DEFAULT: process.env.PURCHASE_LINK_DEFAULT,
  IMAGE_PLACEHOLDER_URL: process.env.IMAGE_PLACEHOLDER_URL
});

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

if (parsedEnv.data.LINE_SERVICE_MODE === "line") {
  const missing: string[] = [];

  if (!parsedEnv.data.LINE_CHANNEL_SECRET) {
    missing.push("LINE_CHANNEL_SECRET");
  }

  if (!parsedEnv.data.LINE_CHANNEL_ACCESS_TOKEN) {
    missing.push("LINE_CHANNEL_ACCESS_TOKEN");
  }

  if (missing.length > 0) {
    throw new Error(`Invalid environment variables: ${missing.join(", ")} are required when LINE_SERVICE_MODE=line`);
  }
}

export const env = {
  ...parsedEnv.data,
  FIREBASE_PRIVATE_KEY: parsedEnv.data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
};
