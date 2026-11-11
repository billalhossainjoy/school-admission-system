import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.union([z.url(), z.literal("/api")]),
});

export const env = envSchema.parse(import.meta.env);
