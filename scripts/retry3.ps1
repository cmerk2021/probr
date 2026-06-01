$ALLOY_KEY = 'alloy_f61ae87aa276580b46fdcdaa5fbcd0a98792e34a737be989a796c9f8bf7a6256'
$OUT = Join-Path $PSScriptRoot '..\api-samples'
$urlEnc = [System.Uri]::EscapeDataString('https://cloudflare.com')

$targets = @(
  @{ n='url-meta'; u="https://api.connormerk.dev/api/url/meta?url=$urlEnc&pretty=true" },
  @{ n='security-headers'; u="https://api.connormerk.dev/api/security/headers?url=$urlEnc&pretty=true" },
  @{ n='security-url'; u="https://api.connormerk.dev/api/security/url?url=$urlEnc&pretty=true" },
  @{ n='internet-diagnose'; u="https://api.connormerk.dev/api/internet/diagnose?domain=cloudflare.com&pretty=true" }
)

foreach ($t in $targets) {
  $file = Join-Path $OUT "$($t.n).json"
  $code = & curl.exe -sS -o $file -w '%{http_code}' -H "x-api-key: $ALLOY_KEY" $t.u
  Write-Host "[$code] $($t.n)"
}
