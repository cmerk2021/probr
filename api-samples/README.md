# Probr — API Reconnaissance (Phase 1)

All endpoints from `https://api.connormerk.dev` were curled with the API key bypass header. Raw JSON responses are stored alongside this README, named per endpoint.

## Response envelope (universal)

```jsonc
{
  "success": true,
  "data":    { /* endpoint-specific payload */ },
  "meta":    { "request_id": "...", "duration_ms": 0, "auth": { ... } },
  "links":   { "self": "...", "docs": "..." },
  "timestamp": "ISO8601",
  "request_id": "ULID"
}
```

Errors return `success: false` with `error: { code, message, details? }`.

## Endpoint inventory & top-level `data` keys

### Network
| File | `data.*` keys |
| --- | --- |
| `network-intelligence.json` | `ip, family, asn, prefix, geo, reverse_dns, rdap, flags` (anycast/bogon under `flags`) |
| `ip-lookup.json` | `ip, family, asn, prefix, reverse_dns, geo, bogon` |
| `asn-lookup.json` | `asn, holder, resource, type, block, announced_prefixes, rdap` |
| `bgp-prefix.json` | `prefix, overview, routes` |
| `bgp-asn.json` | `asn, overview, announced_prefixes` |
| `rpki.json` | `prefix, validations[]` |
| `cidr-analyze.json` | `cidr, family, network, prefix, num_addresses, num_hosts, broadcast, first_host, last_host, netmask, wildcard` |
| `cidr-expand.json` | `cidr, total_addresses, returned, truncated, addresses[]` |
| `cidr-summarize.json` (POST) | `input_count, summarized_count, cidrs[]` |
| `reverse-dns.json` | `ip, ptr[]` |
| `whois-ip.json` | `ip, rdap` |

### DNS
| File | `data.*` |
| --- | --- |
| `dns-lookup.json` | `domain, records{A,AAAA,MX,TXT,NS,CNAME,SOA,CAA}` |
| `dns-a/aaaa/mx/txt/ns/cname.json` | `domain, type, records[]` |
| `dns-dnssec.json` | `domain, ad_flag, ds_records[], dnskey_records[], signed` |
| `dns-spf.json` | `domain, present, record_count, records[], issues[]` |
| `dns-dmarc.json` | `domain, present, records[]` |
| `dns-propagation.json` | `domain, type, results[]` |

### Domain
| File | `data.*` |
| --- | --- |
| `domain-intelligence.json` | `domain, tld, sld, registrar, registered_at, expires_at, age_days, status, dnssec_signed, nameservers, a_records, mx_records, txt_records, ...` |
| `domain-whois.json` | `domain, rdap` |
| `domain-registrar.json` | `domain, registrar` |
| `domain-nameservers.json` | `domain, nameservers` |
| `domain-age.json` | `domain, registered_at, age_days` |

### Email
| File | `data.*` |
| --- | --- |
| `email-health.json` | `domain, grade, score, mx, spf, dmarc, dkim, issues[]` |
| `email-diagnose.json` | `domain, diagnostics, summary` |
| `email-mx/spf/dmarc/dkim.json` | per-component results |

### TLS
| File | `data.*` |
| --- | --- |
| `tls.json` | `host, port, protocol, cipher, alpn, authorized, not_before, not_after, days_remaining, duration_ms` |
| `tls-certificate.json` | `host, port, certificate, chain[]` |
| `tls-ciphers.json` | `host, port, supported[], unsupported[]` |
| `tls-analyze.json` | `host, port, grade, protocol, cipher, certificate, chain_length, supported_ciphers[], unsupported_ciphers[], hostname_match, findings[]` |
| `certificate-transparency.json` | `domain, count, certificates[]` |

### Web
| File | `data.*` |
| --- | --- |
| `site-audit.json` | `url, meta, technologies, security_headers, response` |
| `site-headers.json` | `url, status, headers` |
| `site-robots.json` | `url, status, exists, rules[], sitemaps[], raw` |
| `site-sitemap.json` | `url, status, exists, count, urls[]` |
| `site-performance.json` | `url, status, ttfb_estimate_ms, bytes, compressed, server, cache_control, content_type` |
| `site-technology.json` | `url, technologies[]` |
| `url-meta.json` | **UNREACHABLE — see "Server bug" below** |

### Security
| File | `data.*` |
| --- | --- |
| `security-domain.json` | `domain, score, findings[]` |
| `security-hash.json` | `hash, length, character_set, candidates[]` |
| `security-password.json` (POST) | `score, label, length, unique_chars, entropy_bits` |
| `security-headers.json` | **UNREACHABLE — server bug** |
| `security-url.json` | **UNREACHABLE — server bug** |

### Utilities
| File | `data.*` |
| --- | --- |
| `util-uuid.json` | `uuid, version` |
| `util-uuid-bulk.json` | `count, version, uuids[]` |
| `util-ulid.json` | `ulid` |
| `util-cron.json` | `expression, fields, description` |
| `util-ua.json` | `input, ua, browser, cpu, device, engine, os` |
| `util-slug.json` | `input, slug` — **note: param is `input`, NOT `text`** |
| `util-password-generate.json` | `password, length` |
| `util-qr.json` | **Raw SVG** (not JSON envelope) — `Content-Type: image/svg+xml` |
| `base64-encode.json` (POST) | `input_length, encoded, url_safe` |
| `base64-decode.json` (POST) | `input_length, decoded` |
| `hash-{md5,sha1,sha256,sha512}.json` (POST) | `algorithm, hash, input_length` |
| `jwt-decode.json` (POST) | `header, payload, signature, note` |
| `json-format.json` (POST) | `formatted, bytes` |
| `json-validate.json` (POST) | `valid` |
| `json-to-yaml.json` (POST) | `yaml` |
| `yaml-to-json.json` (POST) | `json` |
| `json-to-csv.json` (POST) | `csv` |
| `csv-to-json.json` (POST) | `rows[], errors[]` |
| `regex-test.json` (POST) | `matched, count, matches[]` |

### Data
| File | `data.*` |
| --- | --- |
| `data-country.json` | `cca2, cca3, name, capital, region, currencies, calling_code, languages, tld` |
| `data-language.json` | `code, name, native` |
| `data-timezone.json` | `timezone, current_time, iso_offset, now_utc` |
| `data-currency.json` | `base, note, currencies` |
| `data-postal.json` | `postal, candidate_countries, valid` |

### Flagship
| File | Notes |
| --- | --- |
| `internet-diagnose.json` | **UNREACHABLE — server bug** |

### Meta
| File | `data.*` |
| --- | --- |
| `meta-endpoints.json` | `[]` of `{ method, path, category, summary, description, authRequired, cacheable, tier }` |
| `meta-categories.json` | `[]` of category strings |
| `meta-status.json` | `service, tagline, version, status, uptime_seconds, open_incidents, announcements[], categories[], endpoint_count, timestamp` |

## Known server-side issues

While running the curls, the upstream API has a routing bug for four endpoints. Any GET that passes a `?url=…` or `?domain=…` query string to these routes is rewritten by upstream middleware so the parameter value is appended into the path as a segment, producing a 404:

```
GET /api/url/meta?url=https://cloudflare.com
→ 404 "Route GET:/api/url/meta/https%3A%2F%2Fcloudflare.com not found"
```

Affected endpoints:

* `GET /api/url/meta`
* `GET /api/security/headers`
* `GET /api/security/url`
* `GET /api/internet/diagnose`

Workarounds attempted (all failed): alternate param names, double-encoding, header-based delivery, POST variants. Probr still ships UI for these tools; when invoked, the tool surfaces the upstream error via the standard `ErrorState` component with the verbatim error envelope so the user can see the cause. They will start working automatically once the upstream issue is fixed.

## Other quirks resolved during recon

* `/api/slug` — uses `?input=` (the prompt example said `?text=`, which yields 400).
* `/api/qr/generate` — returns a raw SVG body, not a JSON envelope. The client treats this endpoint as binary.
