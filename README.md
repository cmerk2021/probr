# Probr

**An all-in-one internet intelligence dashboard.** Probr wraps the [Alloy public API](https://api.connormerk.dev) and exposes every one of its tools through a fast, beautiful, keyboard-friendly UI.

Inspect any IP, ASN, domain, certificate, email setup, HTTP response, or DNS chain — and get back structured, syntax-highlighted, copy-anywhere results. No accounts. No noise. Just answers.

---

## Quick start

```powershell
# Requires Node 20+
npm install
npm run dev      # → http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle
```

### Environment

The app reads its config from a top-level `.env`:

```ini
VITE_ALLOY_BASE_URL=https://api.connormerk.dev
```

The upstream API is currently open and does not require an API key.

---

## What's inside

- **Vite 5 + React 18 + TypeScript** (strict mode, path alias `@/*` → `src/*`)
- **Tailwind 3** with a custom obsidian/electric-indigo theme
- **React Router v6** with per-category lazy bundles
- **Zustand** for history (persisted) and settings
- **Custom `fetch` API client** with envelope unwrapping, retries, in-memory LRU cache, request-id propagation, and a typed `AlloyApiError` class
- **No SSR, no framework** — instant cold start

### Folder layout

```
src/
  api/         # fetch client + endpoints + types
  components/
    layout/    # AppShell, Sidebar, TopBar, MobileNav, nav config
    output/    # MonoValue, ResultCard, StatusBadge, DataTable, JsonViewer
    shared/    # ToolPage harness, ToolInput, Loading/Error states, CopyButton
  hooks/       # useApi, useQ
  pages/
    Dashboard.tsx
    Diagnose.tsx
    History.tsx
    network/  dns/  domain/  email/  tls/
    web/      security/  utilities/  data/
  store/       # zustand stores (history, settings)
  utils/       # cn, formatters, validators
```

### Category coverage

| Category   | Tools |
| ---------- | ----- |
| Network    | IP intel, ASN, BGP (prefix + ASN), RPKI, CIDR (analyze/expand), reverse DNS, IP WHOIS |
| DNS        | Full lookup, per-type records, DNSSEC, SPF+DMARC, propagation |
| Domain     | Intelligence, RDAP, registrar, name servers, age |
| Email      | Health scorecard, full diagnostic, MX/SPF/DMARC/DKIM |
| TLS        | Overview, certificate, ciphers, full grade, CT logs |
| Web        | Site audit, URL metadata, headers, robots, sitemap, performance, tech fingerprint |
| Security   | Headers, domain risk, URL risk, hash classifier, password audit |
| Utilities  | Base64, hash, UUID/ULID, JWT, JSON/YAML/CSV, regex, cron, UA, CIDR summarize, QR, slug, password gen |
| Data       | Country, language, timezone, currency rates, postal |
| Flagship   | Internet Diagnose — multi-protocol health report |

---

## Smart search

The dashboard search bar uses heuristic detection (`src/utils/validators.ts → detectInputType`) to route the right query to the right tool:

| You type        | Probr opens                  |
| --------------- | ---------------------------- |
| `1.1.1.1`       | Network / IP Intelligence    |
| `2606:4700::`   | Network / IP Intelligence    |
| `AS13335`       | Network / ASN                |
| `10.0.0.0/24`   | Network / CIDR Analyze       |
| `cloudflare.com`| Domain / Intelligence        |
| `https://…`     | Web / Site Audit             |
| Anything else   | DNS / Full Lookup            |

---

## API client highlights

`src/api/client.ts`

- Every request appends `?pretty=true` (matches the upstream contract)
- Unwraps the standard envelope `{ success, data, meta, timestamp, request_id }`
- Captures rate-limit headers (`X-RateLimit-Limit/Remaining/Reset`, `Retry-After`) onto `ApiResult.meta.rateLimit` and `AlloyApiError.rateLimit`
- Throws a typed `AlloyApiError` on failure, exposing `code`, `message`, `status`, and the verbatim upstream `envelope`
- 20-entry LRU response cache for GETs
- `apiFetchRaw()` for endpoints that return non-JSON (QR SVG)
- Every `ToolPage` displays `request_id` + `duration_ms` + rate-limit remaining in the meta footer; errors include a one-click "copy details" button and a friendly rate-limit panel when the upstream returns `429`

---

## Known upstream issues

Four endpoints in the public Alloy API currently have a path-rewriting bug in the upstream gateway that rewrites the `?url=` / `?domain=` query value into the URL path before the handler sees it, causing a `404 not_found`. These tools ship in Probr's UI but will display the upstream error verbatim through the standard `ErrorState` until upstream is fixed:

- `GET /api/url/meta` → **Web → URL Metadata**
- `GET /api/security/headers` → **Security → Security Headers**
- `GET /api/security/url` → **Security → URL Risk**
- `GET /api/internet/diagnose` → **Internet Diagnose** (flagship)

We tried — see `scripts/` for the matrix of variants we probed (param renames, encoding, double-encoding, POST conversion, header workarounds). None succeed without an upstream fix.

All other ~70 endpoints work and have curl-captured sample responses in [api-samples/](api-samples/).

---

## Scripts

```
scripts/
  fetch-samples.ps1     # bulk-curl every endpoint into api-samples/
  retry-failed.ps1      # retry endpoints that returned non-200 first time
  probe-*.ps1           # variant probes for the 4 broken endpoints
  body-*.json           # POST bodies for the POST endpoints
```

---

## License

MIT — built by [@conmerk](https://github.com/conmerk).
