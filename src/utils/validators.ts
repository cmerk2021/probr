// Lightweight input validators returning an error string or null.

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|::)$/;
const DOMAIN_RE = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const CIDR_RE = /^([0-9a-fA-F.:]+)\/(\d{1,3})$/;
const ASN_RE = /^(AS)?(\d{1,10})$/i;
const HASH_RE = /^[a-fA-F0-9]+$/;
const URL_RE = /^https?:\/\/.+/i;

export const isIPv4 = (s: string) => IPV4_RE.test(s.trim());
export const isIPv6 = (s: string) => IPV6_RE.test(s.trim());
export const isIp = (s: string) => isIPv4(s) || isIPv6(s);
export const isDomain = (s: string) => DOMAIN_RE.test(s.trim());
export const isCidr = (s: string) => {
  const m = s.trim().match(CIDR_RE);
  if (!m) return false;
  const ip = m[1];
  const prefix = parseInt(m[2], 10);
  if (!isIp(ip)) return false;
  const max = isIPv4(ip) ? 32 : 128;
  return prefix >= 0 && prefix <= max;
};
export const isAsn = (s: string) => ASN_RE.test(s.trim());
export const isUrl = (s: string) => URL_RE.test(s.trim());
export const isHash = (s: string) => {
  const t = s.trim();
  if (!HASH_RE.test(t)) return false;
  return [32, 40, 64, 96, 128].includes(t.length);
};
export const isHost = (s: string) => isDomain(s) || isIp(s);

export type DetectedType = 'ip' | 'domain' | 'cidr' | 'asn' | 'url' | 'host' | 'unknown';

export function detectInputType(s: string): DetectedType {
  const t = s.trim();
  if (!t) return 'unknown';
  if (isUrl(t)) return 'url';
  if (isCidr(t)) return 'cidr';
  if (isIp(t)) return 'ip';
  if (isAsn(t)) return 'asn';
  if (isDomain(t)) return 'domain';
  return 'unknown';
}

export const normalizeAsn = (s: string): string => {
  const m = s.trim().match(ASN_RE);
  return m ? m[2] : s.trim();
};

// Convenience: validators for ToolInput
export const v = {
  ip: (s: string) => (isIp(s) ? null : 'Enter a valid IPv4 or IPv6 address'),
  domain: (s: string) => (isDomain(s) ? null : 'Enter a valid domain (e.g. cloudflare.com)'),
  cidr: (s: string) => (isCidr(s) ? null : 'Enter a CIDR like 10.0.0.0/24'),
  asn: (s: string) => (isAsn(s) ? null : 'Enter an ASN (e.g. 13335 or AS13335)'),
  url: (s: string) => (isUrl(s) ? null : 'Enter a URL starting with http(s)://'),
  host: (s: string) => (isHost(s) ? null : 'Enter a domain or IP address'),
  hash: (s: string) => (isHash(s) ? null : 'Enter a hex hash (MD5/SHA1/SHA256/SHA512)'),
  nonEmpty: (s: string) => (s.trim().length > 0 ? null : 'Required'),
  postal: (s: string) => (s.trim().length >= 3 ? null : 'Enter a postal code'),
};
