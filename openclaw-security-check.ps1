# OpenClaw Security Check Script
# Verifies OpenClaw is running securely
# Usage: powershell -ExecutionPolicy Bypass -File .\openclaw-security-check.ps1

$ErrorActionPreference = "Continue"
$passCount = 0
$failCount = 0
$warnCount = 0
$pass = 0
$fail = 0
$warn = 0
$results = @()

function Add-Result {
    param(
        [string]$status,
        [string]$category,
        [string]$check,
        [string]$detail,
        [string]$fix
    )
    $results += [PSCustomObject]@{
        Status   = $status
        Category = $category
        Check    = $check
        Detail   = $detail
        Fix      = $fix
    }
    $script:total_checks++
    switch ($status) {
        "PASS"  { $script:passCount++ }
        "FAIL"  { $script:failCount++ }
        "WARN"  { $script:warnCount++ }
    }
}

# Header
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   OpenClaw Security Check" -ForegroundColor Cyan
Write-Host "   $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$script:total_checks = 0

# Read config
$configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
$config = $null
if (Test-Path $configPath) {
    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
    } catch {
        Write-Host "[WARN] Could not parse config: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] No config file at $configPath" -ForegroundColor Yellow
}

# ===== 1. GATEWAY SECURITY =====
Write-Host ""
Write-Host "--- 1. Gateway Security ---" -ForegroundColor Green

# 1.1 Bind mode
$bind = if ($config) { $config.gateway.bind } else { $null }
if ($bind -eq "loopback") {
    Add-Result "PASS" "Gateway" "Bind Mode" "Gateway bound to loopback (127.0.0.1)" ""
} elseif ($bind) {
    Add-Result "FAIL" "Gateway" "Bind Mode" "Gateway bound to: $bind" "Set gateway.bind to 'loopback'"
} else {
    Add-Result "FAIL" "Gateway" "Bind Mode" "No gateway.bind configured" "Set gateway.bind to 'loopback'"
}

# 1.2 Auth mode
$authMode = if ($config) { $config.gateway.auth.mode } else { $null }
$authToken = if ($config) { $config.gateway.auth.token } else { $null }
if ($authMode -eq "token") {
    if ($authToken -and $authToken.Length -ge 32) {
        Add-Result "PASS" "Gateway" "Auth Token" "Token configured ($($authToken.Length) chars)" ""
    } else {
        Add-Result "FAIL" "Gateway" "Auth Token" "Token exists but too short or empty" "Generate a long random token (>=32 chars)"
    }
} elseif ($authMode -eq "password") {
    Add-Result "PASS" "Gateway" "Auth Mode" "Password auth enabled" ""
} elseif ($authMode -eq "trusted-proxy") {
    Add-Result "PASS" "Gateway" "Auth Mode" "Trusted proxy auth enabled" "Ensure proxy is properly configured"
} elseif ($authMode) {
    Add-Result "FAIL" "Gateway" "Auth Mode" "Insecure auth mode: $authMode" "Use 'token' or 'password'"
} else {
    Add-Result "FAIL" "Gateway" "Auth Mode" "No gateway.auth configured" "Set gateway.auth.mode to 'token'"
}

# 1.3 Tailscale Serve
$tailscale = if ($config -and $config.gateway.tailscale) { $config.gateway.tailscale.enable } else { $null }
if ($tailscale -eq $true) {
    Add-Result "WARN" "Gateway" "Tailscale Serve" "Tailscale Serve enabled" "Ensure serve has proper ACLs"
}

# 1.4 Bonjour/mDNS
$mdnsMode = if ($config -and $config.discovery -and $config.discovery.mdns) { $config.discovery.mdns.mode } else { $null }
if ($mdnsMode -eq "full") {
    Add-Result "FAIL" "Gateway" "Bonjour/mDNS" "Full mode exposes sensitive info" "Set to 'minimal' or 'off'"
} elseif ($mdnsMode -eq "minimal" -or $mdnsMode -eq "off") {
    Add-Result "PASS" "Gateway" "Bonjour/mDNS" "$mdnsMode mode (safe)" ""
}

# ===== 2. CHANNEL SECURITY =====
Write-Host ""
Write-Host "--- 2. Channel Security ---" -ForegroundColor Green

$channels = @("whatsapp","telegram","signal","discord","slack","msteams")
foreach ($ch in $channels) {
    if ($config -and $config.channels -and $config.channels.$ch) {
        $dmPolicy = $config.channels.$ch.dmPolicy
        if ($dmPolicy -eq "pairing" -or $dmPolicy -eq "allowlist") {
            Add-Result "PASS" "Channel" "$ch DM Policy" "Set to '$dmPolicy' (secure)" ""
        } elseif ($dmPolicy -eq "open") {
            Add-Result "FAIL" "Channel" "$ch DM Policy" "Set to 'open' (insecure)" "Set to 'pairing' or 'allowlist'"
        } elseif ($dmPolicy -eq "disabled") {
            Add-Result "PASS" "Channel" "$ch DM Policy" "Disabled (no DMs accepted)" ""
        } else {
            Add-Result "WARN" "Channel" "$ch DM Policy" "Unrecognized: $dmPolicy" "Verify this is intentional"
        }
    }
}

# 2.2 Session DM Scope
$dmScope = if ($config) { $config.session.dmScope } else { $null }
if ($dmScope -eq "per-channel-peer" -or $dmScope -eq "per-account-channel-peer") {
    Add-Result "PASS" "Channel" "DM Scope" "Set to '$dmScope' (isolated)" ""
} elseif ($dmScope) {
    Add-Result "WARN" "Channel" "DM Scope" "Set to '$dmScope'" "Consider 'per-channel-peer'"
}

# 2.3 Mention Gating
$hasMentionGating = $false
if ($config -and $config.agents -and $config.agents.list) {
    foreach ($agent in $config.agents.list) {
        if ($agent.groupChat -and $agent.groupChat.mentionPatterns) {
            $hasMentionGating = $true
        }
    }
}
if ($hasMentionGating) {
    Add-Result "PASS" "Channel" "Mention Gating" "Agents have mention patterns" ""
}

# ===== 3. FILE SYSTEM SECURITY =====
Write-Host ""
Write-Host "--- 3. File System Security ---" -ForegroundColor Green

$openclawDir = "$env:USERPROFILE\.openclaw"
if (Test-Path $openclawDir) {
    # Check ACL for config dir
    $acl = Get-Acl $openclawDir
    $users = $acl.Access | Where-Object {
        $_.IdentityReference -ne "BUILTIN\Administrators" -and
        $_.IdentityReference -ne "NT AUTHORITY\SYSTEM" -and
        $_.IdentityReference -ne "BUILTIN\Users"
    }
    if ($users.Count -eq 0) {
        Add-Result "PASS" "FS" "Config Dir ACL" "$openclawDir has standard access (secure)" ""
    } else {
        $nonAdmin = $users | Where-Object { $_.FileSystemRights -eq "FullControl" }
        if ($nonAdmin) {
            Add-Result "WARN" "FS" "Config Dir ACL" "$openclawDir has custom FullControl entries" "Review who has access"
        }
    }

    # Check credentials dir
    $credsDir = Join-Path $openclawDir "credentials"
    if (Test-Path $credsDir) {
        $credAcl = Get-Acl $credsDir
        $credUsers = $credAcl.Access | Where-Object { $_.IdentityReference -ne "BUILTIN\Administrators" -and $_.IdentityReference -ne "NT AUTHORITY\SYSTEM" }
        if ($credUsers.Count -eq 0) {
            Add-Result "PASS" "FS" "Credentials Dir ACL" "Credentials dir is protected" ""
        } else {
            Add-Result "WARN" "FS" "Credentials Dir ACL" "Credentials dir has custom entries" "Restrict to your user only"
        }
    }

    # Check secrets.json
    $secretsFile = Join-Path $openclawDir "secrets.json"
    if (Test-Path $secretsFile) {
        $secAcl = Get-Acl $secretsFile
        $secUsers = $secAcl.Access | Where-Object { $_.IdentityReference -ne "BUILTIN\Administrators" -and $_.IdentityReference -ne "NT AUTHORITY\SYSTEM" -and $_.IdentityReference -ne "BUILTIN\Users" }
        if ($secUsers.Count -eq 0) {
            Add-Result "PASS" "FS" "Secrets File ACL" "secrets.json is protected" ""
        } else {
            Add-Result "FAIL" "FS" "Secrets File ACL" "secrets.json has broad access" "Restrict to your user only (600)"
        }
    }
} else {
    Add-Result "FAIL" "FS" "Config Dir" "$openclawDir not found" "Check your OpenClaw install"
}

# Check for symlinks in sensitive dirs
$sensitiveDirs = @("credentials", "secrets.json", "openclaw.json", "plugins")
foreach ($dir in $sensitiveDirs) {
    $target = Join-Path $openclawDir $dir
    if (Test-Path $target -ErrorAction SilentlyContinue) {
        if ((Get-Item $target).Attributes.ToString().Contains("ReparsePoint")) {
            Add-Result "WARN" "FS" "Symlink: $dir" "Found symlink in sensitive path" "Verify symlink target is safe"
        }
    }
}

# ===== 4. TOOL POLICY =====
Write-Host ""
Write-Host "--- 4. Tool Policy ---" -ForegroundColor Green

# 4.1 Exec Security
$execSec = if ($config) { $config.tools.exec.security } else { $null }
if ($execSec -eq "deny") {
    Add-Result "PASS" "Tool" "Exec Security" "Exec security set to 'deny'" ""
} elseif ($execSec -eq "full") {
    Add-Result "WARN" "Tool" "Exec Security" "Exec security set to 'full' (permissive)" "Consider 'deny' or 'allowlist'"
} elseif ($execSec -eq "allowlist") {
    Add-Result "PASS" "Tool" "Exec Security" "Exec security: allowlist" ""
}

# 4.2 Auto-allow skills
$autoAllow = if ($config -and $config.tools.exec) { $config.tools.exec.autoAllowSkills } else { $null }
if ($autoAllow -eq $true) {
    Add-Result "WARN" "Tool" "Auto-Allow Skills" "Skills auto-approved" "Verify all skill exec is intentional"
}

# 4.3 Elevated Tools
$elevated = if ($config -and $config.tools -and $config.tools.elevated) { $config.tools.elevated.enabled } else { $null }
if ($elevated -eq $true) {
    Add-Result "FAIL" "Tool" "Elevated Tools" "Elevated tools enabled" "Disable unless absolutely needed"
} else {
    Add-Result "PASS" "Tool" "Elevated Tools" "Elevated tools disabled" ""
}

# 4.4 Browser SSRF
$ssrf = if ($config -and $config.browser -and $config.browser.ssrfPolicy) {
    $config.browser.ssrfPolicy.dangerouslyAllowPrivateNetwork
} else { $null }
if ($ssrf -eq $true) {
    Add-Result "FAIL" "Tool" "Browser SSRF" "Private network access allowed" "Set dangerouslyAllowPrivateNetwork to false"
} else {
    Add-Result "PASS" "Tool" "Browser SSRF" "Private network access blocked" ""
}

# 4.5 Sandbox Mode
$sandbox = if ($config -and $config.agents -and $config.agents.defaults -and $config.agents.defaults.sandbox) {
    $config.agents.defaults.sandbox.mode
} else { $null }
if ($sandbox -eq "all") {
    Add-Result "PASS" "Tool" "Sandbox Mode" "Sandbox enabled for all" ""
} elseif ($sandbox) {
    Add-Result "WARN" "Tool" "Sandbox Mode" "Sandbox: $sandbox" "Consider 'all' for stronger isolation"
}

# 4.6 Context Visibility
$ctxVis = if ($config -and $config.contextVisibility) { $config.contextVisibility } else { $null }
if ($ctxVis -eq "allowlist" -or $ctxVis -eq "allowlist_quote") {
    Add-Result "PASS" "Tool" "Context Visibility" "Context filtered to allowlist" ""
}

# ===== 5. DANGEROUS FLAGS =====
Write-Host ""
Write-Host "--- 5. Dangerous Flags ---" -ForegroundColor Green

$dangerousFlags = @{
    "gateway.controlUi.allowInsecureAuth"                          = "Disable"
    "gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback"   = "Disable"
    "gateway.controlUi.dangerouslyDisableDeviceAuth"               = "Disable"
    "hooks.gmail.allowUnsafeExternalContent"                        = "Set to false"
    "hooks.mappings.allowUnsafeExternalContent"                     = "Set to false"
}

foreach ($flagPath in $dangerousFlags.Keys) {
    $parts = $flagPath -split '\.'
    $value = $config
    $found = $false
    foreach ($part in $parts) {
        if ($value -and $value.PSObject.Properties.Name -contains $part) {
            $value = $value.$part
        } else {
            $value = $null
            break
        }
    }
    if ($value -ne $null -and $value -ne $false -and $value -ne $null) {
        Add-Result "FAIL" "Dangerous Flag" $flagPath "Flag set to: $value" $dangerousFlags[$flagPath]
    } else {
        Add-Result "PASS" "Dangerous Flag" $flagPath "Not set (secure)" ""
    }
}

# ===== 6. PLUGIN SECURITY =====
Write-Host ""
Write-Host "--- 6. Plugin Security ---" -ForegroundColor Green

if ($config -and $config.plugins) {
    if ($config.plugins.allow -or $config.plugins.entries) {
        Add-Result "PASS" "Plugin" "Plugin Allowlist" "Plugins limited by allowlist" ""
    } else {
        Add-Result "WARN" "Plugin" "Plugin Allowlist" "No plugin allowlist" "Consider limiting plugins to trusted sources"
    }
}

# ===== 7. MODEL HYGIENE =====
Write-Host ""
Write-Host "--- 7. Model Hygiene ---" -ForegroundColor Green

if ($config -and $config.agents -and $config.agents.list) {
    $strongModels = @("qwen2","qwen3","llama3","llama4","gpt-4","gpt-5","claude")
    foreach ($agent in $config.agents.list) {
        if ($agent.model) {
            $isStrong = $false
            foreach ($model in $strongModels) {
                if ($agent.model.ToLower().Contains($model.ToLower())) {
                    $isStrong = $true
                    break
                }
            }
            if ($isStrong) {
                Add-Result "PASS" "Model" "${agent.id}: Model" "Using: $($agent.model)" ""
            } else {
                Add-Result "WARN" "Model" "${agent.id}: Model" "Using: $($agent.model)" "Consider a stronger model for tool access"
            }
        }
    }
}

# ===== 8. NETWORK EXPOSURE =====
Write-Host ""
Write-Host "--- 8. Network Exposure ---" -ForegroundColor Green

if ($bind -eq "loopback") {
    Add-Result "PASS" "Network" "Port Binding" "Gateway bound to loopback (secure)" ""
} elseif ($bind) {
    $port = if ($config -and $config.gateway) { $config.gateway.port } else { "18789" }
    Add-Result "WARN" "Network" "Port Binding" "Gateway bound to: $bind on port $port" "Verify firewall rules"
}

# Check firewall rules
try {
    $fwRules = Get-NetFirewallRule -DisplayName "*openclaw*" -ErrorAction SilentlyContinue
    if ($fwRules.Count -gt 0) {
        Add-Result "PASS" "Network" "Firewall" "$($fwRules.Count) OpenClaw firewall rule(s)" ""
    } else {
        Add-Result "WARN" "Network" "Firewall" "No OpenClaw-specific firewall rules" "Consider adding inbound rules for port $port"
    }
} catch {
    Add-Result "WARN" "Network" "Firewall" "Could not check (run as admin)" ""
}

# Check Tailscale port status
$tailscalePort = if ($config -and $config.gateway -and $config.gateway.tailscale) {
    $config.gateway.tailscale.port
} else { $null }
if ($tailscalePort) {
    Add-Result "WARN" "Network" "Tailscale Port" "Tailscale port: $tailscalePort" "Verify this is intentional"
}

# ===== SUMMARY =====
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SECURITY CHECK SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PASS:   $passCount" -ForegroundColor Green
Write-Host "   FAIL:   $failCount" -ForegroundColor Red
Write-Host "   WARN:   $warnCount" -ForegroundColor Yellow
Write-Host "   TOTAL:  $total_checks" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Detailed results
if ($results.Count -gt 0) {
    $results | Format-Table -AutoSize -Property Status, Category, Check, Detail
    Write-Host ""
}

# Failures
if ($failCount -gt 0) {
    Write-Host "[CRITICAL] $($failCount) checks failed:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  [FAIL] [$($_.Category)] $($_.Check): $($_.Detail)" -ForegroundColor Red
        if ($_.Fix) {
            Write-Host "         Fix: $($_.Fix)" -ForegroundColor Cyan
        }
    }
    Write-Host ""
}

# Warnings
if ($warnCount -gt 0) {
    Write-Host "[WARNING] $($warnCount) checks warned:" -ForegroundColor Yellow
    $results | Where-Object { $_.Status -eq "WARN" } | ForEach-Object {
        Write-Host "  [WARN] [$($_.Category)] $($_.Check): $($_.Detail)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Score
if ($total_checks -gt 0) {
    $score = [math]::Round(($passCount / $total_checks) * 100)
    Write-Host "Overall Security Score: $score% ($passCount/$total_checks checks passed)" -ForegroundColor Cyan
    Write-Host ""
    if ($score -ge 90) {
        Write-Host "  Excellent! Your OpenClaw is well-secured." -ForegroundColor Green
    } elseif ($score -ge 70) {
        Write-Host "  Good, but some hardening recommended." -ForegroundColor Yellow
    } else {
        Write-Host "  Needs attention. Fix the failed checks above." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Recommended next steps:" -ForegroundColor Gray
Write-Host "  1. openclaw security audit --deep" -ForegroundColor Gray
Write-Host "  2. openclaw security audit --fix" -ForegroundColor Gray
Write-Host ""
