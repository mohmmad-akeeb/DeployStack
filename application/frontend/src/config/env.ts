/**
 * Typed environment configuration wrapper.
 */

export const env = {
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
  APP_TITLE: import.meta.env.VITE_APP_TITLE || "DeployStack",
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
