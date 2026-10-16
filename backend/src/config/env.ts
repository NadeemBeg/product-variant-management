import { z } from "zod";

/**
 * Centralised, validated configuration. The app never reads `process.env`
 * directly anywhere else — everything funnels through this typed object so a
 * missing/invalid value fails fast at boot instead of at request time.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/pvms"),
  // Where uploaded images are written and served from (swap for S3/OCI in prod).
  UPLOAD_DIR: z.string().default("uploads"),
  PUBLIC_BASE_URL: z.string().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().default("*"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
export const isTest = env.NODE_ENV === "test";
