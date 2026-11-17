# Domain migration: shoposphere.in → descko.in

## Code defaults (this repo)

- Storefront: `https://descko.in` (`VITE_PUBLIC_SITE_ORIGIN`)
- API: `https://api.descko.in` (`VITE_API_URL`)
- Backend CORS allows `descko.in`, `www.descko.in`, and legacy `shoposphere.in` (remove legacy when redirects end)

## 1. DNS & hosting

| Host | Purpose |
|------|---------|
| `descko.in` / `www.descko.in` | Frontend (Vercel or Hostinger) |
| `api.descko.in` | Node backend (same server as today, new subdomain) |

Point `api.descko.in` A/CNAME to your backend host (where `shoposphere` API ran before).

## 2. Frontend env (Vercel / build)

Set in production:

```env
VITE_API_URL=https://api.descko.in
VITE_PUBLIC_SITE_ORIGIN=https://descko.in
VITE_INSTAGRAM_HANDLE=your_instagram_username
```

Redeploy after changing env vars.

## 3. Backend env (Hostinger / VPS)

```env
FRONTEND_URL=https://descko.in
GOOGLE_CALLBACK_URL=https://api.descko.in/auth/login/federated/google/callback
```

Optional: `CORS_ORIGINS` if you use extra preview URLs.

Restart the API process after updating `.env`.

## 4. Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth client:

- **Authorized JavaScript origins:** `https://descko.in`, `https://www.descko.in`
- **Authorized redirect URIs:** `https://api.descko.in/auth/login/federated/google/callback`

Remove or keep old `shoposphere.in` entries until redirect is live.

## 5. Razorpay / webhooks

Update webhook URL host to `https://api.descko.in/...` if you configured a absolute URL in the Razorpay dashboard.

## 6. Old domain

- Add **301 redirects** on `shoposphere.in` → `https://descko.in` (same path).
- Keep old origins in CORS until redirects and OAuth are stable, then remove from `shoposphere-sbackend/index.js`.

## 7. What did *not* change automatically

- Email addresses in Footer/Contact (e.g. Gmail) — update manually if you have a `@descko.in` mailbox.
- Customer-facing brand in the app is **Descko** (UI copy + `public/logo.png`).
- Instagram/Facebook handles — set `VITE_INSTAGRAM_HANDLE` to your real handle.