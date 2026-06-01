$ALLOY_KEY = 'alloy_f61ae87aa276580b46fdcdaa5fbcd0a98792e34a737be989a796c9f8bf7a6256'
$urls = @(
  'https://api.connormerk.dev/api/url/meta',
  'https://api.connormerk.dev/api/url/meta?u=https://cloudflare.com',
  'https://api.connormerk.dev/api/url/meta?target=https://cloudflare.com',
  'https://api.connormerk.dev/api/url/metadata?url=https://cloudflare.com',
  'https://api.connormerk.dev/api/security/headers',
  'https://api.connormerk.dev/api/security/headers?target=https://cloudflare.com',
  'https://api.connormerk.dev/api/security/headers?domain=cloudflare.com',
  'https://api.connormerk.dev/api/security/url',
  'https://api.connormerk.dev/api/security/url?target=https://cloudflare.com',
  'https://api.connormerk.dev/api/internet/diagnose',
  'https://api.connormerk.dev/api/internet/diagnose?target=cloudflare.com',
  'https://api.connormerk.dev/api/internet/diagnose?host=cloudflare.com'
)
foreach ($u in $urls) {
  $tmp = Join-Path $env:TEMP 'probe.txt'
  $code = & curl.exe -sS -o $tmp -w '%{http_code}' -H "x-api-key: $ALLOY_KEY" $u
  $body = Get-Content $tmp -Raw -ErrorAction SilentlyContinue
  $snip = if ($body) { $body.Substring(0, [Math]::Min(220, $body.Length)) } else { '' }
  Write-Host "[$code] $u"
  Write-Host "      $snip"
}
