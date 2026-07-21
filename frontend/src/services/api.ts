import type { User, Post } from "../types";

const API_BASE = "";

export interface ApiMeta {
  service?: string;
  instance?: string;
  cache?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; meta: ApiMeta }> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.detail || "Something went wrong");
  }

  const meta: ApiMeta = {
    service: res.headers.get("X-Service") ?? undefined,
    instance: res.headers.get("X-Instance-Id") ?? undefined,
    cache: res.headers.get("X-Cache") ?? undefined,
  };

  return { data, meta };
}

export const api = {
  register: (body: {
    username: string;
    email: string;
    password: string;
    name: string;
  }) =>
    request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.data),

  login: (body: { email: string; password: string }) =>
    request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.data),

  me: () => request<{ user: User }>("/api/auth/me").then((r) => r.data),

  getPosts: () =>
    request<{ posts: Post[] }>("/api/posts"),

  createPost: (content: string) =>
    request<{ post: Post }>("/api/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    }).then((r) => r.data),
};
