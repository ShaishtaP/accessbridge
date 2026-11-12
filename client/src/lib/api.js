// Small fetch wrapper: adds the JSON headers and the saved token, and turns
// the server's { error } responses into thrown Errors with that message.
const TOKEN_KEY = 'accessbridge_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 204 No Content has no body to parse.
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    // Validation errors carry per-field details; the first one is the most useful message.
    const detail = data.details?.[0]?.message;
    const err = new Error(detail || data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
