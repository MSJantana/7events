const runtimeEnv = (globalThis as any).env as { API_URL?: string } | undefined

export const API_URL =
  (runtimeEnv?.API_URL ||
    ((import.meta as any).env?.VITE_API_URL as string | undefined)) ||
  'http://localhost:4000'
