export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  IS_DEV: import.meta.env.DEV,
  SHOW_DEV_TOOLS: import.meta.env.VITE_DEV_TOOLS === 'true',
} as const;
