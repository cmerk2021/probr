$ErrorActionPreference = 'Continue'
$ALLOY_KEY = 'alloy_f61ae87aa276580b46fdcdaa5fbcd0a98792e34a737be989a796c9f8bf7a6256'
$BASE = 'https://api.connormerk.dev'
$OUT = Join-Path $PSScriptRoot '..\api-samples'

function Curl-Save {
    param([string]$Name, [string]$Url, [string]$Method = 'GET', [string]$Body = $null)
    $file = Join-Path $OUT "$Name.json"
    try {
        if ($Method -eq 'POST') {
            $out = & curl.exe -sS -X POST -H "x-api-key: $ALLOY_KEY" -H "Content-Type: application/json" -d $Body $Url 2>&1
        } else {
            $out = & curl.exe -sS -H "x-api-key: $ALLOY_KEY" $Url 2>&1
        }
        $out | Set-Content -Path $file -Encoding UTF8
        # Try to parse for success info
        try {
            $j = $out | ConvertFrom-Json
            if ($j.success) { Write-Host "OK  $Name" }
            else { Write-Host "API-ERR $Name -> $($j.error.message)" }
        } catch {
            Write-Host "PARSE? $Name (saved raw)"
        }
    } catch {
        Write-Host "EXC $Name -> $($_.Exception.Message)"
    }
}

# Retry timeouts / 404s
Curl-Save 'domain-intelligence' "$BASE/api/domain/intelligence/cloudflare.com?pretty=true"
Curl-Save 'domain-whois' "$BASE/api/domain/whois/cloudflare.com?pretty=true"
Curl-Save 'domain-registrar' "$BASE/api/domain/registrar/cloudflare.com?pretty=true"
Curl-Save 'certificate-transparency' "$BASE/api/certificate-transparency/cloudflare.com?pretty=true"
Curl-Save 'url-meta' "$BASE/api/url/meta?url=https%3A%2F%2Fcloudflare.com&pretty=true"
Curl-Save 'security-headers' "$BASE/api/security/headers?url=https%3A%2F%2Fcloudflare.com&pretty=true"
Curl-Save 'security-url' "$BASE/api/security/url?url=https%3A%2F%2Fcloudflare.com&pretty=true"
Curl-Save 'util-slug' "$BASE/api/slug?text=Hello%20World%20Example&pretty=true"
Curl-Save 'internet-diagnose' "$BASE/api/internet/diagnose?domain=cloudflare.com&pretty=true"

Write-Host "RETRY DONE"
