import { AUTH_DIR, SESSION_PATH, ensureDir, requiredEnv } from "./config";
import { ApiError, apiFetch, isRecord } from "./api";
import type { AuthProfile, LoginResponse, Session } from "./types";

export async function getSession(): Promise<Session> {
  const envToken = process.env.TPG_ACCESS_TOKEN?.trim();
  if (envToken) {
    const profile = await loadProfile(envToken);
    return saveSession({ accessToken: envToken, profile, savedAt: new Date().toISOString() });
  }

  const existing = await readSession();
  if (existing) {
    try {
      const profile = await loadProfile(existing.accessToken);
      return saveSession({ ...existing, profile, savedAt: new Date().toISOString() });
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        throw error;
      }
    }
  }

  const email = requiredEnv("TPG_EMAIL");
  const password = requiredEnv("TPG_PASSWORD");
  const login = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (login.role?.toLowerCase() !== "student") {
    throw new Error("This portal is only available to student accounts.");
  }

  const profile = await loadProfile(login.accessToken);
  return saveSession({
    accessToken: login.accessToken,
    profile,
    savedAt: new Date().toISOString(),
  });
}

async function loadProfile(accessToken: string): Promise<AuthProfile> {
  const profile = await apiFetch<AuthProfile>("/auth/profile", { accessToken });
  if (profile.role?.toLowerCase() !== "student") {
    throw new Error("This portal is only available to student accounts.");
  }
  return profile;
}

async function readSession(): Promise<Session | null> {
  const file = Bun.file(SESSION_PATH);
  if (!(await file.exists())) return null;
  const value = await file.json();
  if (
    !isRecord(value) ||
    typeof value.accessToken !== "string" ||
    !isRecord(value.profile) ||
    typeof value.profile.uid !== "string"
  ) {
    return null;
  }
  return value as Session;
}

async function saveSession(session: Session): Promise<Session> {
  await ensureDir(AUTH_DIR);
  await Bun.write(SESSION_PATH, JSON.stringify(session, null, 2));
  return session;
}
