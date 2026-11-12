// One small fetch wrapper for the admin API. Every write carries the
// X-Requested-With header the server requires (see lib/admin/auth.js).
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || `HTTP ${status}`);
    this.status = status;
    this.data = data || {};
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) { onUnauthorized = handler; }

export async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`/admin/api${path}`, {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(method !== "GET" ? { "X-Requested-With": "admin" } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await response.json(); } catch { /* an empty or non-JSON answer */ }
  if (response.status === 401 && data?.error === "auth") onUnauthorized();
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export const MESSAGES = {
  rate: "Túl sok próbálkozás. Várj néhány percet, és próbáld újra.",
  mail: "A belépő levelet most nem sikerült elküldeni. Próbáld újra kicsit később.",
  token: "Ez a belépő link lejárt vagy már felhasználtad. Kérj újat.",
  disabled: "Az admin még nincs bekapcsolva ezen a szerveren (hiányzó beállítás).",
  publishing: "A közzététel még nincs bekötve: hiányzik a GitHub hozzáférés (ADMIN_GITHUB_TOKEN).",
  origin: "A kérést a böngésző biztonsági okból elutasította. Töltsd újra az oldalt.",
  size: "Túl nagy a feltöltött tartalom.",
  server: "Szerverhiba történt. Próbáld újra.",
  posthog: "A PostHog most nem válaszolt.",
};
export const messageOf = (error) => (error instanceof ApiError ? MESSAGES[error.data?.error] || error.data?.error || "Ismeretlen hiba." : "Nincs kapcsolat a szerverrel.");
