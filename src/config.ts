import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const PORTAL_ORIGIN = "https://enrolment-student.tpg.cds.hku.hk";
export const API_BASE = `${PORTAL_ORIGIN}/api`;
export const TIMEZONE = "Asia/Hong_Kong";

export const EXCLUDED_ENROLLMENT_STATUSES = new Set([5, 6, 7]);

export const AUTH_DIR = join(process.cwd(), ".auth");
export const SESSION_PATH = join(AUTH_DIR, "session.json");
export const OUT_DIR = join(process.cwd(), "out");

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill in your Student Portal credentials.`,
    );
  }
  return value;
}
