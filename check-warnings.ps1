$config = Get-Content "$env:USERPROFILE\.openclaw\openclaw.json" -Raw | ConvertFrom-Json

Write-Host "=== Current OpenClaw Warnings ===" -ForegroundColor Yellow
Write-Host ""

if ($config.gateway.tailscale -and $config.gateway.tailscale.enable) {
    Write-Host "[WARN] Tailscale Serve is enabled" -ForegroundColor Yellow
    if ($config.gateway.tailscale.port) {
        Write-Host "   Tailscale port: $($config.gateway.tailscale.port)" -ForegroundColor Gray
    }
}

if ($config.plugins -and (-not $config.plugins.allow) -and (-not $config.plugins.entries)) {
    Write-Host "[WARN] No plugin allowlist configured" -ForegroundColor Yellow
}

if ($config.agents.defaults.sandbox.mode) {
    Write-Host "[WARN] Sandbox mode: $($config.agents.defaults.sandbox.mode)" -ForegroundColor Yellow
}

if ($config.tools.exec.security -eq "full") {
    Write-Host "[WARN] Exec security: full (permissive)" -ForegroundColor Yellow
}

if ($config.contextVisibility) {
    Write-Host "[WARN] Context visibility: $($config.contextVisibility)" -ForegroundColor Yellow
}

if (-not $config) {
    Write-Host "Could not read config" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Quick Config Summary ===" -ForegroundColor Cyan
$bind = if($config.gateway.bind){$config.gateway.bind}else{"not set"}
$auth = if($config.gateway.auth.mode){$config.gateway.auth.mode}else{"not set"}
$exec = if($config.tools.exec.security){$config.tools.exec.security}else{"not set"}
$sandbox = if($config.agents.defaults.sandbox.mode){$config.agents.defaults.sandbox.mode}else{"not set"}
$dmScope = if($config.session.dmScope){$config.session.dmScope}else{"not set"}
Write-Host "Bind:     " -NoNewline; Write-Host $bind -ForegroundColor Green
Write-Host "Auth:     " -NoNewline; Write-Host $auth -ForegroundColor Green
Write-Host "Exec:     " -NoNewline; Write-Host $exec -ForegroundColor Green
Write-Host "Sandbox:  " -NoNewline; Write-Host $sandbox -ForegroundColor Green
Write-Host "DM Scope: " -NoNewline; Write-Host $dmScope -ForegroundColor Green

if ($config.gateway.auth.token) {
    $tokenLen = $config.gateway.auth.token.Length
    Write-Host "Token:    " -NoNewline; Write-Host "OK ($tokenLen chars)" -ForegroundColor Green
}
