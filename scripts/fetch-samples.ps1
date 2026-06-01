$ErrorActionPreference = 'Continue'
$ALLOY_KEY = 'alloy_f61ae87aa276580b46fdcdaa5fbcd0a98792e34a737be989a796c9f8bf7a6256'
$BASE = 'https://api.connormerk.dev'
$OUT = Join-Path $PSScriptRoot '..\api-samples'
New-Item -ItemType Directory -Path $OUT -Force | Out-Null

$headers = @{ 'x-api-key' = $ALLOY_KEY }

function Get-Json {
    param([string]$Name, [string]$Path, [string]$Method = 'GET', [object]$Body = $null)
    $url = "$BASE$Path"
    if ($url -notmatch '\?') { $url += '?pretty=true' } else { $url += '&pretty=true' }
    $file = Join-Path $OUT "$Name.json"
    try {
        if ($Method -eq 'POST') {
            $json = $Body | ConvertTo-Json -Depth 10 -Compress
            $resp = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -ContentType 'application/json' -Body $json -TimeoutSec 60
        } else {
            $resp = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -TimeoutSec 60
        }
        $resp | ConvertTo-Json -Depth 20 | Set-Content -Path $file -Encoding UTF8
        Write-Host "OK  $Name"
    } catch {
        $err = @{ error = $_.Exception.Message; url = $url }
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $err.body = $_.ErrorDetails.Message
        }
        $err | ConvertTo-Json -Depth 5 | Set-Content -Path $file -Encoding UTF8
        Write-Host "ERR $Name -> $($_.Exception.Message)"
    }
}

# NETWORK
Get-Json 'network-intelligence' '/api/network/intelligence/8.8.8.8'
Get-Json 'ip-lookup' '/api/ip/8.8.8.8'
Get-Json 'asn-lookup' '/api/asn/13335'
Get-Json 'bgp-prefix' '/api/bgp/prefix/1.1.1.0%2F24'
Get-Json 'bgp-asn' '/api/bgp/asn/13335'
Get-Json 'rpki' '/api/rpki/1.1.1.0%2F24'
Get-Json 'cidr-analyze' '/api/cidr/analyze/10.0.0.0%2F24'
Get-Json 'cidr-expand' '/api/cidr/expand/10.0.0.0%2F30'
Get-Json 'reverse-dns' '/api/reverse-dns/8.8.8.8'
Get-Json 'whois-ip' '/api/whois/ip/8.8.8.8'

# DNS
Get-Json 'dns-lookup' '/api/dns/lookup/cloudflare.com'
Get-Json 'dns-a' '/api/dns/a/cloudflare.com'
Get-Json 'dns-aaaa' '/api/dns/aaaa/cloudflare.com'
Get-Json 'dns-mx' '/api/dns/mx/cloudflare.com'
Get-Json 'dns-txt' '/api/dns/txt/cloudflare.com'
Get-Json 'dns-ns' '/api/dns/ns/cloudflare.com'
Get-Json 'dns-cname' '/api/dns/cname/www.cloudflare.com'
Get-Json 'dns-dnssec' '/api/dns/dnssec/cloudflare.com'
Get-Json 'dns-spf' '/api/dns/spf/cloudflare.com'
Get-Json 'dns-dmarc' '/api/dns/dmarc/cloudflare.com'
Get-Json 'dns-propagation' '/api/dns/propagation/cloudflare.com'

# DOMAIN
Get-Json 'domain-intelligence' '/api/domain/intelligence/cloudflare.com'
Get-Json 'domain-whois' '/api/domain/whois/cloudflare.com'
Get-Json 'domain-registrar' '/api/domain/registrar/cloudflare.com'
Get-Json 'domain-nameservers' '/api/domain/nameservers/cloudflare.com'
Get-Json 'domain-age' '/api/domain/age/cloudflare.com'

# EMAIL
Get-Json 'email-health' '/api/email/health/cloudflare.com'
Get-Json 'email-mx' '/api/email/mx/cloudflare.com'
Get-Json 'email-spf' '/api/email/spf/cloudflare.com'
Get-Json 'email-dmarc' '/api/email/dmarc/cloudflare.com'
Get-Json 'email-dkim' '/api/email/dkim/cloudflare.com'
Get-Json 'email-diagnose' '/api/email/diagnose/cloudflare.com'

# TLS
Get-Json 'tls' '/api/tls/cloudflare.com'
Get-Json 'tls-certificate' '/api/tls/certificate/cloudflare.com'
Get-Json 'tls-ciphers' '/api/tls/ciphers/cloudflare.com'
Get-Json 'tls-analyze' '/api/tls/analyze/cloudflare.com'
Get-Json 'certificate-transparency' '/api/certificate-transparency/cloudflare.com'

# WEB
Get-Json 'url-meta' '/api/url/meta?url=https://cloudflare.com'
Get-Json 'site-audit' '/api/site/audit/cloudflare.com'
Get-Json 'site-headers' '/api/site/headers/cloudflare.com'
Get-Json 'site-robots' '/api/site/robots/cloudflare.com'
Get-Json 'site-sitemap' '/api/site/sitemap/cloudflare.com'
Get-Json 'site-performance' '/api/site/performance/cloudflare.com'
Get-Json 'site-technology' '/api/site/technology/cloudflare.com'

# SECURITY
Get-Json 'security-headers' '/api/security/headers?url=https://cloudflare.com'
Get-Json 'security-hash' '/api/security/hash/5d41402abc4b2a76b9719d911017c592'
Get-Json 'security-domain' '/api/security/domain/cloudflare.com'
Get-Json 'security-url' '/api/security/url?url=https://cloudflare.com'

# UTILITIES (GET)
Get-Json 'util-uuid' '/api/uuid'
Get-Json 'util-uuid-bulk' '/api/uuid/bulk'
Get-Json 'util-ulid' '/api/ulid'
Get-Json 'util-cron' '/api/cron/parse?expr=0+*+*+*+*'
Get-Json 'util-ua' '/api/ua/parse?ua=Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29+AppleWebKit%2F537.36'
Get-Json 'util-slug' '/api/slug?text=Hello+World+Example'
Get-Json 'util-password-generate' '/api/password/generate'
Get-Json 'util-qr' '/api/qr/generate?data=https://probr.dev'

# DATA
Get-Json 'data-timezone' '/api/timezone?tz=America%2FNew_York'
Get-Json 'data-country' '/api/country/US'
Get-Json 'data-currency' '/api/currency/rates'
Get-Json 'data-language' '/api/language/en'
Get-Json 'data-postal' '/api/postal/10001'

# FLAGSHIP
Get-Json 'internet-diagnose' '/api/internet/diagnose?domain=cloudflare.com'

# META
Get-Json 'meta-endpoints' '/api/meta/endpoints'
Get-Json 'meta-categories' '/api/meta/categories'
Get-Json 'meta-status' '/api/meta/status'

# POST endpoints
Get-Json 'cidr-summarize' '/api/cidr/summarize' 'POST' @{ cidrs = @('10.0.0.0/24','10.0.1.0/24','10.0.2.0/24') }
Get-Json 'security-password' '/api/security/password' 'POST' @{ password = 'Hunter2!' }
Get-Json 'base64-encode' '/api/base64/encode' 'POST' @{ input = 'Hello, Probr!' }
Get-Json 'base64-decode' '/api/base64/decode' 'POST' @{ input = 'SGVsbG8sIFByb2JyIQ==' }
Get-Json 'hash-md5' '/api/hash/md5' 'POST' @{ input = 'Hello, Probr!' }
Get-Json 'hash-sha1' '/api/hash/sha1' 'POST' @{ input = 'Hello, Probr!' }
Get-Json 'hash-sha256' '/api/hash/sha256' 'POST' @{ input = 'Hello, Probr!' }
Get-Json 'hash-sha512' '/api/hash/sha512' 'POST' @{ input = 'Hello, Probr!' }
Get-Json 'jwt-decode' '/api/jwt/decode' 'POST' @{ token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }
Get-Json 'json-format' '/api/json/format' 'POST' @{ input = '{"name":"Probr","version":"1.0"}' }
Get-Json 'json-validate' '/api/json/validate' 'POST' @{ input = '{"name":"Probr"}' }
Get-Json 'yaml-to-json' '/api/yaml/to-json' 'POST' @{ input = "name: Probr`nversion: 1.0" }
Get-Json 'json-to-yaml' '/api/json/to-yaml' 'POST' @{ input = '{"name":"Probr","version":"1.0"}' }
Get-Json 'csv-to-json' '/api/csv/to-json' 'POST' @{ input = "name,version`nProbr,1.0" }
Get-Json 'json-to-csv' '/api/json/to-csv' 'POST' @{ input = '[{"name":"Probr","version":"1.0"}]' }
Get-Json 'regex-test' '/api/regex/test' 'POST' @{ pattern = '^[a-z]+$'; input = 'hello'; flags = 'i' }

Write-Host "DONE"
