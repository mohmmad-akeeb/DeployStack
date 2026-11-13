import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { ApiErrorResponse } from "./types";

export const TOKEN_STORAGE_KEY = "deploystack_auth_token";

export const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor to attach JWT Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Dispatch custom event for AuthContext to react without page reload
      window.dispatchEvent(new CustomEvent("deploystack:unauthorized"));
    }
    return Promise.reject(error);
  }
);

/**
 * Format Axios / Backend error into a human-friendly string.
 */
export function formatApiError(error: unknown, fallbackMessage = "An unexpected error occurred"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data) {
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }
      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        // FastAPI validation errors
        const messages = data.detail.map((d) => {
          if (typeof d === "string") return d;
          if (d.msg) {
            const loc = Array.isArray(d.loc) ? d.loc.filter((l) => l !== "body").join(".") : "";
            return loc ? `${loc}: ${d.msg}` : d.msg;
          }
          if (d.issue && d.field) return `${d.field}: ${d.issue}`;
          return JSON.stringify(d);
        });
        return messages.join(", ");
      }
    }
    if (error.message) {
      return error.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
