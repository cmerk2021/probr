$ErrorActionPreference = 'Continue'
$ALLOY_KEY = 'alloy_f61ae87aa276580b46fdcdaa5fbcd0a98792e34a737be989a796c9f8bf7a6256'
$BASE = 'https://api.connormerk.dev'
$OUT = Join-Path $PSScriptRoot '..\api-samples'

function Curl-Save {
    param([string]$Name, [string]$Url)
    $file = Join-Path $OUT "$Name.json"
    $out = & curl.exe -sS -H "x-api-key: $ALLOY_KEY" $Url 2>&1
    $out | Set-Content -Path $file -Encoding UTF8
    try {
        $j = $out | ConvertFrom-Json
        if ($j.success) { Write-Host "OK  $Name" }
        else { Write-Host "ERR $Name -> $($j.error.message)" }
    } catch { Write-Host "RAW $Name" }
}

$urlEnc = [System.Uri]::EscapeDataString('https://cloudflare.com')

# Try alternate forms
Curl-Save 'url-meta' "$BASE/api/url/meta/$urlEnc`?pretty=true"
Curl-Save 'security-headers' "$BASE/api/security/headers/$urlEnc`?pretty=true"
Curl-Save 'security-url' "$BASE/api/security/url/$urlEnc`?pretty=true"
Curl-Save 'util-slug' "$BASE/api/slug?input=Hello%20World%20Example&pretty=true"
Curl-Save 'internet-diagnose-q' "$BASE/api/internet/diagnose?host=cloudflare.com&pretty=true"
Curl-Save 'internet-diagnose-path' "$BASE/api/internet/diagnose/cloudflare.com?pretty=true"
