// In dev: VITE_API_URL is empty → relative paths → Vite proxy → localhost:5000
// In prod: VITE_API_URL is Railway URL → absolute paths
const BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  return `${BASE}${path}`;
}
