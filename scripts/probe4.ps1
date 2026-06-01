$k='alloy_f61ae87aa276580b46fdcdaa5fbcd0a98792e34a737be989a796c9f8bf7a6256'
$tests = @(
  'https://api.connormerk.dev/api/url/meta?z=1&url=https%3A%2F%2Fcloudflare.com',
  'https://api.connormerk.dev/api/url/meta?url=https%3A%2F%2Fcloudflare.com&z=1',
  'https://api.connormerk.dev/api/url/meta?url=cloudflare.com',
  'https://api.connormerk.dev/api/url/meta?url=https%253A%252F%252Fcloudflare.com',
  'https://api.connormerk.dev/api/security/headers?url=cloudflare.com',
  'https://api.connormerk.dev/api/security/url?url=cloudflare.com',
  'https://api.connormerk.dev/api/internet/diagnose?domain=cloudflare.com&extra=1'
)
foreach ($u in $tests) {
  Write-Host "=== $u"
  & curl.exe -sS -H "x-api-key: $k" $u
  Write-Host ''
}
