import {
  Activity,
  Binary,
  Box,
  Building2,
  Code2,
  Database,
  FileJson,
  Fingerprint,
  Globe2,
  Hash,
  Home,
  KeyRound,
  Languages,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  Network,
  QrCode,
  Radar,
  Regex,
  Search,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Shuffle,
  Signal,
  Smartphone,
  TerminalSquare,
  Timer,
  Workflow,
  Zap,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon?: typeof Home;
}
export interface NavSection {
  label: string;
  icon: typeof Home;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Network',
    icon: Network,
    items: [
      { label: 'IP Intelligence', path: '/network/ip' },
      { label: 'ASN Lookup', path: '/network/asn' },
      { label: 'BGP Explorer', path: '/network/bgp' },
      { label: 'RPKI Validator', path: '/network/rpki' },
      { label: 'CIDR Tools', path: '/network/cidr' },
      { label: 'Reverse DNS', path: '/network/rdns' },
      { label: 'IP WHOIS', path: '/network/whois' },
    ],
  },
  {
    label: 'DNS',
    icon: Search,
    items: [
      { label: 'Full Lookup', path: '/dns/lookup' },
      { label: 'Record Types', path: '/dns/records' },
      { label: 'DNSSEC', path: '/dns/dnssec' },
      { label: 'Email Auth (SPF + DMARC)', path: '/dns/email' },
      { label: 'Propagation', path: '/dns/propagation' },
    ],
  },
  {
    label: 'Domain',
    icon: Building2,
    items: [
      { label: 'Intelligence', path: '/domain/intelligence' },
      { label: 'WHOIS / RDAP', path: '/domain/whois' },
      { label: 'Registrar', path: '/domain/registrar' },
      { label: 'Name Servers', path: '/domain/nameservers' },
      { label: 'Age Check', path: '/domain/age' },
    ],
  },
  {
    label: 'Email',
    icon: Mail,
    items: [
      { label: 'Health Check', path: '/email/health' },
      { label: 'Full Diagnostic', path: '/email/diagnose' },
      { label: 'MX Records', path: '/email/mx' },
      { label: 'SPF', path: '/email/spf' },
      { label: 'DMARC', path: '/email/dmarc' },
      { label: 'DKIM', path: '/email/dkim' },
    ],
  },
  {
    label: 'TLS / Certs',
    icon: Lock,
    items: [
      { label: 'Overview', path: '/tls/overview' },
      { label: 'Certificate', path: '/tls/certificate' },
      { label: 'Cipher Suites', path: '/tls/ciphers' },
      { label: 'Full Analysis', path: '/tls/analyze' },
      { label: 'CT Log Search', path: '/tls/ct' },
    ],
  },
  {
    label: 'Web',
    icon: Globe2,
    items: [
      { label: 'Site Audit', path: '/web/audit' },
      { label: 'URL Metadata', path: '/web/url-meta' },
      { label: 'HTTP Headers', path: '/web/headers' },
      { label: 'robots.txt', path: '/web/robots' },
      { label: 'Sitemap', path: '/web/sitemap' },
      { label: 'Performance', path: '/web/performance' },
      { label: 'Tech Fingerprint', path: '/web/technology' },
    ],
  },
  {
    label: 'Security',
    icon: ShieldCheck,
    items: [
      { label: 'Security Headers', path: '/security/headers' },
      { label: 'Domain Risk', path: '/security/domain' },
      { label: 'URL Risk', path: '/security/url' },
      { label: 'Hash Classifier', path: '/security/hash' },
      { label: 'Password Audit', path: '/security/password' },
    ],
  },
  {
    label: 'Utilities',
    icon: TerminalSquare,
    items: [
      { label: 'Encode / Decode', path: '/utils/encode' },
      { label: 'Hash Generator', path: '/utils/hash' },
      { label: 'UUID / ULID', path: '/utils/ids' },
      { label: 'JWT Decoder', path: '/utils/jwt' },
      { label: 'JSON Tools', path: '/utils/json' },
      { label: 'Regex Tester', path: '/utils/regex' },
      { label: 'Cron Parser', path: '/utils/cron' },
      { label: 'User Agent', path: '/utils/ua' },
      { label: 'CIDR Summarizer', path: '/utils/cidr-summarize' },
      { label: 'QR Generator', path: '/utils/qr' },
      { label: 'Slugify', path: '/utils/slug' },
      { label: 'Password Gen', path: '/utils/password' },
    ],
  },
  {
    label: 'Data',
    icon: Database,
    items: [
      { label: 'Country Info', path: '/data/country' },
      { label: 'Language Info', path: '/data/language' },
      { label: 'Timezone', path: '/data/timezone' },
      { label: 'Currency Codes', path: '/data/currency' },
      { label: 'Postal Code', path: '/data/postal' },
    ],
  },
];

export const TOP_LINKS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Internet Diagnose', path: '/diagnose', icon: Zap },
  { label: 'History', path: '/history', icon: ListChecks },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

// Re-export icons used elsewhere (categories cards)
export const Icons = {
  Activity, Binary, Box, Building2, Code2, Database, FileJson, Fingerprint, Globe2, Hash, Home,
  KeyRound, Languages, ListChecks, Lock, Mail, MapPin, Network, QrCode, Radar, Regex, Search,
  Server, ShieldCheck, Shuffle, Signal, Smartphone, TerminalSquare, Timer, Workflow, Zap,
};
