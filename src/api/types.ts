// Probr — TypeScript types for Alloy API responses.
// Derived from Phase 1 reconnaissance. Where the API returns flexible/partial
// shapes, fields are marked optional. Catch-all `[key: string]: unknown` lets
// the UI surface fields we did not explicitly model.

export interface Geo {
  country?: string;
  country_name?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  postal?: string;
  [k: string]: unknown;
}

export interface AsnSummary {
  asn?: number;
  holder?: string;
  name?: string;
  country?: string;
  [k: string]: unknown;
}

export interface NetworkIntelligence {
  ip: string;
  family?: 'ipv4' | 'ipv6';
  asn?: AsnSummary | null;
  prefix?: string | null;
  geo?: Geo;
  reverse_dns?: string[];
  rdap?: unknown;
  flags?: {
    bogon?: boolean;
    anycast?: boolean;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface IpLookup {
  ip: string;
  family?: string;
  asn?: AsnSummary | null;
  prefix?: string | null;
  reverse_dns?: string[];
  geo?: Geo;
  bogon?: boolean;
  [k: string]: unknown;
}

export interface AsnLookup {
  asn: number;
  holder?: string;
  resource?: string;
  type?: string;
  block?: { resource?: string; name?: string; description?: string; [k: string]: unknown };
  announced_prefixes?: Array<{ prefix: string; [k: string]: unknown }>;
  rdap?: unknown;
  [k: string]: unknown;
}

export interface BgpPrefix {
  prefix: string;
  overview?: unknown;
  routes?: unknown[];
  [k: string]: unknown;
}

export interface BgpAsn {
  asn: number;
  overview?: unknown;
  announced_prefixes?: Array<{ prefix: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

export interface RpkiValidation {
  prefix: string;
  validations: Array<{
    asn?: number;
    state?: 'valid' | 'invalid' | 'unknown' | string;
    max_length?: number;
    [k: string]: unknown;
  }>;
  [k: string]: unknown;
}

export interface CidrAnalyze {
  cidr: string;
  family?: string;
  network?: string;
  prefix?: number;
  num_addresses?: number;
  num_hosts?: number;
  broadcast?: string;
  first_host?: string;
  last_host?: string;
  netmask?: string;
  wildcard?: string;
  [k: string]: unknown;
}

export interface CidrExpand {
  cidr: string;
  total_addresses: number;
  returned: number;
  truncated: boolean;
  addresses: string[];
}

export interface CidrSummarize {
  input_count: number;
  summarized_count: number;
  cidrs: string[];
}

export interface ReverseDns {
  ip: string;
  ptr: string[];
}

export interface WhoisIp {
  ip: string;
  rdap?: unknown;
  [k: string]: unknown;
}

export type DnsRecordType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA' | 'CAA';

export interface DnsRecordEntry {
  value?: string;
  data?: string;
  ttl?: number;
  priority?: number;
  [k: string]: unknown;
}

export interface DnsTypedRecords {
  domain: string;
  type: DnsRecordType;
  records: DnsRecordEntry[];
}

export interface DnsLookup {
  domain: string;
  records: Partial<Record<DnsRecordType, DnsRecordEntry[]>>;
  [k: string]: unknown;
}

export interface DnsSec {
  domain: string;
  ad_flag?: boolean;
  ds_records?: unknown[];
  dnskey_records?: unknown[];
  signed?: boolean;
  [k: string]: unknown;
}

export interface DnsSpf {
  domain: string;
  present?: boolean;
  record_count?: number;
  records?: Array<{ raw?: string; mechanisms?: unknown[]; [k: string]: unknown }>;
  issues?: Array<{ severity?: string; message?: string; [k: string]: unknown }>;
}

export interface DnsDmarc {
  domain: string;
  present?: boolean;
  records?: Array<{ raw?: string; tags?: Record<string, unknown>; [k: string]: unknown }>;
}

export interface DnsPropagation {
  domain: string;
  type?: string;
  results: Array<{
    resolver?: string;
    location?: string;
    answers?: string[];
    ok?: boolean;
    [k: string]: unknown;
  }>;
}

export interface DomainIntelligence {
  domain: string;
  tld?: string;
  sld?: string;
  registrar?: string;
  registered_at?: string;
  expires_at?: string;
  age_days?: number;
  status?: string[];
  dnssec_signed?: boolean;
  nameservers?: string[];
  a_records?: string[];
  mx_records?: Array<{ exchange: string; priority?: number }>;
  txt_records?: string[];
  [k: string]: unknown;
}

export interface DomainWhois {
  domain: string;
  rdap?: unknown;
}

export interface DomainRegistrar {
  domain: string;
  registrar?: string | null;
  [k: string]: unknown;
}

export interface DomainNameservers {
  domain: string;
  nameservers: string[];
}

export interface DomainAge {
  domain: string;
  registered_at?: string;
  age_days?: number;
}

export interface EmailHealth {
  domain: string;
  grade?: string;
  score?: number;
  mx?: Array<{ exchange?: string; priority?: number }>;
  spf?: string[];
  dmarc?: string[];
  dkim?: Array<{ selector?: string; record?: string }>;
  issues?: Array<string | { severity?: string; message?: string; code?: string }>;
}

export interface EmailDiagnose {
  domain: string;
  diagnostics: Array<{
    id?: string;
    level?: string;
    message?: string;
  }>;
  summary: {
    mx?: Array<{ exchange?: string; priority?: number }>;
    spf?: string[];
    dmarc?: string[];
    dkim?: Array<{ selector?: string; record?: string }>;
    [k: string]: unknown;
  };
}

export interface EmailMx {
  domain: string;
  mx: Array<{ exchange?: string; priority?: number }>;
}

export interface EmailSpf {
  domain: string;
  records: string[];
}

export interface EmailDkim {
  domain: string;
  selectors_checked?: number;
  dkim: Array<{ selector?: string; record?: string }>;
}

export interface TlsOverview {
  host: string;
  port?: number;
  protocol?: string;
  cipher?: string | { name?: string; standardName?: string; [k: string]: unknown };
  alpn?: string;
  authorized?: boolean;
  not_before?: string;
  not_after?: string;
  days_remaining?: number;
  duration_ms?: number;
}

export interface CertInfo {
  subject?: Record<string, string> | string;
  issuer?: Record<string, string> | string;
  subject_alt_names?: string[];
  san?: string[];
  serial?: string;
  fingerprint?: string;
  fingerprint_sha256?: string;
  fingerprint_sha1?: string;
  valid_from?: string;
  valid_to?: string;
  not_before?: string;
  not_after?: string;
  days_remaining?: number;
  key_type?: string;
  key_bits?: number;
  signature_algorithm?: string;
  [k: string]: unknown;
}

export interface TlsCertificate {
  host: string;
  port?: number;
  certificate: CertInfo;
  chain?: CertInfo[];
}

export interface TlsCiphers {
  host: string;
  port?: number;
  supported: Array<string | { name?: string; protocol?: string; [k: string]: unknown }>;
  unsupported: Array<string | { name?: string; protocol?: string; [k: string]: unknown }>;
}

export interface TlsAnalyze {
  host: string;
  port?: number;
  grade?: string;
  protocol?: string;
  cipher?: { name?: string; standardName?: string; version?: string; [k: string]: unknown } | string;
  certificate?: CertInfo;
  chain_length?: number;
  supported_ciphers?: Array<string | { name?: string; protocol?: string }>;
  unsupported_ciphers?: Array<string | { name?: string; protocol?: string }>;
  hostname_match?: boolean;
  findings?: Array<{ severity?: string; message?: string; [k: string]: unknown }>;
}

export interface CertificateTransparency {
  domain: string;
  count: number;
  certificates: Array<{
    issuer_name?: string;
    common_name?: string;
    name_value?: string;
    not_before?: string;
    not_after?: string;
    [k: string]: unknown;
  }>;
}

export interface SecHeaderInfo {
  present?: boolean;
  value?: string | null;
  [k: string]: unknown;
}

export interface SiteAuditMeta {
  url?: string;
  status?: number;
  title?: string;
  description?: string;
  language?: string;
  charset?: string;
  og?: Record<string, string>;
  twitter?: Record<string, string>;
  icons?: string[];
  links?: { internal?: number; external?: number };
  duration_ms?: number;
  [k: string]: unknown;
}

export interface SiteAudit {
  url: string;
  meta?: SiteAuditMeta;
  technologies?: string[] | Array<{ name?: string; [k: string]: unknown }>;
  security_headers?: Record<string, SecHeaderInfo>;
  response?: {
    status?: number;
    bytes?: number;
    content_type?: string;
    compressed?: boolean;
    headers?: Record<string, string>;
    [k: string]: unknown;
  };
}

export interface SiteHeaders {
  url: string;
  status: number;
  headers: Record<string, string | string[]>;
}

export interface SiteRobots {
  url: string;
  status?: number;
  exists?: boolean;
  rules?: Array<{ user_agent?: string; allow?: string[]; disallow?: string[]; [k: string]: unknown }>;
  sitemaps?: string[];
  raw?: string;
}

export interface SiteSitemap {
  url: string;
  status?: number;
  exists?: boolean;
  count?: number;
  urls?: string[];
}

export interface SitePerformance {
  url: string;
  status?: number;
  ttfb_estimate_ms?: number;
  bytes?: number;
  compressed?: boolean;
  server?: string;
  cache_control?: string;
  content_type?: string;
  [k: string]: unknown;
}

export interface SiteTechnology {
  url: string;
  technologies: Array<string | { name?: string; category?: string; version?: string; icon?: string; website?: string; [k: string]: unknown }>;
}

export interface SecurityHeaders {
  url: string;
  status?: number;
  grade?: string;
  present_count?: number;
  headers: Record<string, SecHeaderInfo>;
}

export interface SecurityUrl {
  url: string;
  score?: number;
  findings?: Array<{ severity?: string; message?: string; code?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

export interface SecurityHash {
  hash: string;
  length: number;
  character_set?: string;
  candidates: Array<string | { name?: string; bits?: number; [k: string]: unknown }>;
}

export interface SecurityDomain {
  domain: string;
  score?: number;
  findings: Array<{ severity?: string; message?: string; [k: string]: unknown }>;
}

export interface SecurityPassword {
  score: number;
  label?: string;
  length: number;
  unique_chars?: number;
  entropy_bits?: number;
  [k: string]: unknown;
}

export interface UuidGen {
  uuid: string;
  version: number;
}
export interface UuidBulk {
  count: number;
  version: number;
  uuids: string[];
}
export interface UlidGen {
  ulid: string;
}
export interface CronParse {
  expression: string;
  fields: Record<string, unknown>;
  description?: string;
  next_runs?: string[];
  [k: string]: unknown;
}
export interface UaParse {
  input: string;
  ua: string;
  browser?: { name?: string; version?: string; [k: string]: unknown };
  cpu?: { architecture?: string };
  device?: { vendor?: string; model?: string; type?: string };
  engine?: { name?: string; version?: string };
  os?: { name?: string; version?: string };
}
export interface Slugified {
  input: string;
  slug: string;
}
export interface PasswordGen {
  password: string;
  length: number;
}

export interface Base64Encoded {
  input_length: number;
  encoded: string;
  url_safe?: string;
}
export interface Base64Decoded {
  input_length: number;
  decoded: string;
}
export interface HashResult {
  algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512';
  hash: string;
  input_length: number;
}
export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  note?: string;
}
export interface JsonFormatted {
  formatted: string;
  bytes?: number;
}
export interface JsonValidated {
  valid: boolean;
  error?: string;
}
export interface YamlConverted {
  yaml?: string;
  json?: unknown;
}
export interface CsvConverted {
  csv?: string;
  rows?: Array<Record<string, unknown>>;
  errors?: unknown[];
}
export interface RegexTest {
  matched: boolean;
  count: number;
  matches: Array<{ match?: string; index?: number; groups?: unknown[] | Record<string, unknown> }>;
}

export interface CountryInfo {
  cca2: string;
  cca3?: string;
  name?: { common?: string; official?: string } | string;
  capital?: string[] | string;
  region?: string;
  currencies?: Record<string, { name?: string; symbol?: string }> | unknown;
  calling_code?: string;
  languages?: Record<string, string> | unknown;
  tld?: string[];
  [k: string]: unknown;
}
export interface LanguageInfo {
  code: string;
  name?: string;
  native?: string;
  [k: string]: unknown;
}
export interface TimezoneInfo {
  timezone: string;
  current_time?: string;
  iso_offset?: string;
  now_utc?: string;
  [k: string]: unknown;
}
export interface CurrencyInfo {
  base?: string;
  note?: string;
  currencies?: Record<string, unknown>;
}
export interface PostalInfo {
  postal: string;
  candidate_countries: string[];
  valid: boolean;
  [k: string]: unknown;
}

export interface MetaEndpoint {
  method: string;
  path: string;
  category: string;
  summary?: string;
  description?: string;
  authRequired?: boolean;
  cacheable?: boolean;
  tier?: string;
}

export interface MetaStatus {
  service: string;
  tagline?: string;
  version?: string;
  status?: string;
  uptime_seconds?: number;
  open_incidents?: number;
  announcements?: Array<unknown>;
  categories?: string[];
  endpoint_count?: number;
  timestamp?: string;
}

export interface InternetDiagnose {
  domain: string;
  grade?: string;
  score?: number;
  summary?: { pass?: number; warn?: number; fail?: number };
  findings?: Array<{ id?: string; level?: 'pass' | 'warn' | 'fail' | string; message?: string }>;
  sections?: Record<string, unknown>;
  duration_ms?: number;
  [k: string]: unknown;
}
