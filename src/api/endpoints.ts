import { apiFetch, apiFetchRaw, type ApiResult } from './client';
import type * as T from './types';

const enc = encodeURIComponent;

// NETWORK
export const network = {
  intelligence: (ip: string) => apiFetch<T.NetworkIntelligence>(`/api/network/intelligence/${enc(ip)}`),
  ip: (ip: string) => apiFetch<T.IpLookup>(`/api/ip/${enc(ip)}`),
  asn: (asn: string | number) => apiFetch<T.AsnLookup>(`/api/asn/${enc(String(asn))}`),
  bgpPrefix: (prefix: string) => apiFetch<T.BgpPrefix>(`/api/bgp/prefix/${enc(prefix)}`),
  bgpAsn: (asn: string | number) => apiFetch<T.BgpAsn>(`/api/bgp/asn/${enc(String(asn))}`),
  rpki: (prefix: string) => apiFetch<T.RpkiValidation>(`/api/rpki/${enc(prefix)}`),
  cidrAnalyze: (cidr: string) => apiFetch<T.CidrAnalyze>(`/api/cidr/analyze/${enc(cidr)}`),
  cidrExpand: (cidr: string) => apiFetch<T.CidrExpand>(`/api/cidr/expand/${enc(cidr)}`),
  cidrSummarize: (cidrs: string[]) =>
    apiFetch<T.CidrSummarize>('/api/cidr/summarize', { method: 'POST', body: { cidrs } }),
  reverseDns: (ip: string) => apiFetch<T.ReverseDns>(`/api/reverse-dns/${enc(ip)}`),
  whoisIp: (ip: string) => apiFetch<T.WhoisIp>(`/api/whois/ip/${enc(ip)}`),
};

// DNS
export const dns = {
  lookup: (domain: string) => apiFetch<T.DnsLookup>(`/api/dns/lookup/${enc(domain)}`),
  a: (domain: string) => apiFetch<T.DnsTypedRecords>(`/api/dns/a/${enc(domain)}`),
  aaaa: (domain: string) => apiFetch<T.DnsTypedRecords>(`/api/dns/aaaa/${enc(domain)}`),
  mx: (domain: string) => apiFetch<T.DnsTypedRecords>(`/api/dns/mx/${enc(domain)}`),
  txt: (domain: string) => apiFetch<T.DnsTypedRecords>(`/api/dns/txt/${enc(domain)}`),
  ns: (domain: string) => apiFetch<T.DnsTypedRecords>(`/api/dns/ns/${enc(domain)}`),
  cname: (domain: string) => apiFetch<T.DnsTypedRecords>(`/api/dns/cname/${enc(domain)}`),
  dnssec: (domain: string) => apiFetch<T.DnsSec>(`/api/dns/dnssec/${enc(domain)}`),
  spf: (domain: string) => apiFetch<T.DnsSpf>(`/api/dns/spf/${enc(domain)}`),
  dmarc: (domain: string) => apiFetch<T.DnsDmarc>(`/api/dns/dmarc/${enc(domain)}`),
  propagation: (domain: string) => apiFetch<T.DnsPropagation>(`/api/dns/propagation/${enc(domain)}`),
};

// DOMAIN
export const domain = {
  intelligence: (d: string) => apiFetch<T.DomainIntelligence>(`/api/domain/intelligence/${enc(d)}`),
  whois: (d: string) => apiFetch<T.DomainWhois>(`/api/domain/whois/${enc(d)}`),
  registrar: (d: string) => apiFetch<T.DomainRegistrar>(`/api/domain/registrar/${enc(d)}`),
  nameservers: (d: string) => apiFetch<T.DomainNameservers>(`/api/domain/nameservers/${enc(d)}`),
  age: (d: string) => apiFetch<T.DomainAge>(`/api/domain/age/${enc(d)}`),
};

// EMAIL
export const email = {
  health: (d: string) => apiFetch<T.EmailHealth>(`/api/email/health/${enc(d)}`),
  diagnose: (d: string) => apiFetch<T.EmailDiagnose>(`/api/email/diagnose/${enc(d)}`),
  mx: (d: string) => apiFetch<T.EmailMx>(`/api/email/mx/${enc(d)}`),
  spf: (d: string) => apiFetch<T.EmailSpf>(`/api/email/spf/${enc(d)}`),
  dmarc: (d: string) => apiFetch<unknown>(`/api/email/dmarc/${enc(d)}`),
  dkim: (d: string) => apiFetch<T.EmailDkim>(`/api/email/dkim/${enc(d)}`),
};

// TLS
export const tls = {
  overview: (host: string) => apiFetch<T.TlsOverview>(`/api/tls/${enc(host)}`),
  certificate: (host: string) => apiFetch<T.TlsCertificate>(`/api/tls/certificate/${enc(host)}`),
  ciphers: (host: string) => apiFetch<T.TlsCiphers>(`/api/tls/ciphers/${enc(host)}`),
  analyze: (host: string) => apiFetch<T.TlsAnalyze>(`/api/tls/analyze/${enc(host)}`),
  ct: (domain: string) => apiFetch<T.CertificateTransparency>(`/api/certificate-transparency/${enc(domain)}`),
};

// WEB
export const web = {
  urlMeta: (url: string) => apiFetch<T.SiteAuditMeta>(`/api/url/meta`, { query: { url } }),
  audit: (domain: string) => apiFetch<T.SiteAudit>(`/api/site/audit/${enc(domain)}`),
  headers: (domain: string) => apiFetch<T.SiteHeaders>(`/api/site/headers/${enc(domain)}`),
  robots: (domain: string) => apiFetch<T.SiteRobots>(`/api/site/robots/${enc(domain)}`),
  sitemap: (domain: string) => apiFetch<T.SiteSitemap>(`/api/site/sitemap/${enc(domain)}`),
  performance: (domain: string) => apiFetch<T.SitePerformance>(`/api/site/performance/${enc(domain)}`),
  technology: (domain: string) => apiFetch<T.SiteTechnology>(`/api/site/technology/${enc(domain)}`),
};

// SECURITY
export const security = {
  headers: (url: string) => apiFetch<T.SecurityHeaders>(`/api/security/headers`, { query: { url } }),
  url: (url: string) => apiFetch<T.SecurityUrl>(`/api/security/url`, { query: { url } }),
  hash: (hash: string) => apiFetch<T.SecurityHash>(`/api/security/hash/${enc(hash)}`),
  domain: (d: string) => apiFetch<T.SecurityDomain>(`/api/security/domain/${enc(d)}`),
  password: (password: string) =>
    apiFetch<T.SecurityPassword>(`/api/security/password`, { method: 'POST', body: { password } }),
};

// UTILITIES
export const utilities = {
  uuid: () => apiFetch<T.UuidGen>(`/api/uuid`),
  uuidBulk: (count?: number) =>
    apiFetch<T.UuidBulk>(`/api/uuid/bulk`, { query: count ? { count } : undefined }),
  ulid: () => apiFetch<T.UlidGen>(`/api/ulid`),
  cron: (expr: string) => apiFetch<T.CronParse>(`/api/cron/parse`, { query: { expr } }),
  ua: (ua: string) => apiFetch<T.UaParse>(`/api/ua/parse`, { query: { ua } }),
  slug: (input: string) => apiFetch<T.Slugified>(`/api/slug`, { query: { input } }),
  passwordGen: (length?: number) =>
    apiFetch<T.PasswordGen>(`/api/password/generate`, { query: length ? { length } : undefined }),
  qrSvg: (data: string) => apiFetchRaw(`/api/qr/generate`, { data }),
  base64Encode: (input: string) =>
    apiFetch<T.Base64Encoded>(`/api/base64/encode`, { method: 'POST', body: { input } }),
  base64Decode: (input: string) =>
    apiFetch<T.Base64Decoded>(`/api/base64/decode`, { method: 'POST', body: { input } }),
  hash: (algo: 'md5' | 'sha1' | 'sha256' | 'sha512', input: string) =>
    apiFetch<T.HashResult>(`/api/hash/${algo}`, { method: 'POST', body: { input } }),
  jwtDecode: (token: string) =>
    apiFetch<T.JwtDecoded>(`/api/jwt/decode`, { method: 'POST', body: { token } }),
  jsonFormat: (input: string) =>
    apiFetch<T.JsonFormatted>(`/api/json/format`, { method: 'POST', body: { input } }),
  jsonValidate: (input: string) =>
    apiFetch<T.JsonValidated>(`/api/json/validate`, { method: 'POST', body: { input } }),
  jsonToYaml: (input: string) =>
    apiFetch<T.YamlConverted>(`/api/json/to-yaml`, { method: 'POST', body: { input } }),
  yamlToJson: (input: string) =>
    apiFetch<T.YamlConverted>(`/api/yaml/to-json`, { method: 'POST', body: { input } }),
  jsonToCsv: (input: string) =>
    apiFetch<T.CsvConverted>(`/api/json/to-csv`, { method: 'POST', body: { input } }),
  csvToJson: (input: string) =>
    apiFetch<T.CsvConverted>(`/api/csv/to-json`, { method: 'POST', body: { input } }),
  regexTest: (pattern: string, input: string, flags?: string) =>
    apiFetch<T.RegexTest>(`/api/regex/test`, { method: 'POST', body: { pattern, input, flags } }),
};

// DATA
export const data = {
  country: (code: string) => apiFetch<T.CountryInfo>(`/api/country/${enc(code)}`),
  language: (code: string) => apiFetch<T.LanguageInfo>(`/api/language/${enc(code)}`),
  timezone: (tz: string) => apiFetch<T.TimezoneInfo>(`/api/timezone`, { query: { tz } }),
  currency: () => apiFetch<T.CurrencyInfo>(`/api/currency/rates`),
  postal: (postal: string) => apiFetch<T.PostalInfo>(`/api/postal/${enc(postal)}`),
};

// FLAGSHIP
export const flagship = {
  internetDiagnose: (domain: string) =>
    apiFetch<T.InternetDiagnose>(`/api/internet/diagnose`, { query: { domain } }),
};

// META
export const meta = {
  endpoints: () => apiFetch<T.MetaEndpoint[]>(`/api/meta/endpoints`),
  categories: () => apiFetch<string[]>(`/api/meta/categories`),
  status: () => apiFetch<T.MetaStatus>(`/api/meta/status`),
};

export const api = { network, dns, domain, email, tls, web, security, utilities, data, flagship, meta };
export type ApiCall<T = unknown> = () => Promise<ApiResult<T>>;
