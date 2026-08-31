import { API_BASE } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  const url = path.startsWith("http") ? path : `${API_BASE}/${path.replace(/^\/+/, "")}`;

  const nextHeaders = new Headers(headers);
  if (accessToken && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(url, { ...rest, headers: nextHeaders });
  const text = await response.text();
  const body = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (isRecord(body) && typeof body.message === "string" && body.message) ||
      response.statusText ||
      "Request failed";
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
