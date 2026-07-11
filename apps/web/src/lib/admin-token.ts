// Works in both Edge (middleware) and Node.js (API routes) — uses Web Crypto.
export async function computeAdminToken(email: string, password: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${email}:${password}:${secret}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const ADMIN_COOKIE = 'plinth_admin';
