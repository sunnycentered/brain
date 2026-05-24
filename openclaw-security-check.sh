#!/usr/bin/env bash
# OpenClaw Security Check — runs anywhere with bash
# Tested: WSL, Ubuntu, Alpine, macOS, Debian, CentOS
# No external dependencies required (pure bash)

# Exit gracefully on error
set +e  # Don't exit on error — we handle failures ourselves

pass=0
fail=0
warn=0
total=0

# Colors (fallback to no-color if terminal doesn't support)
if tput setaf 1 >/dev/null 2>&1; then
    GREEN=$(tput setaf 2); RED=$(tput setaf 1)
    YELLOW=$(tput setaf 3); CYAN=$(tput setaf 6)
    WHITE=$(tput setaf 7); GRAY=$(tput setaf 0)
    NC=$(tput sgr0)
else
    GREEN=""; RED=""; YELLOW=""; CYAN=""; WHITE=""; GRAY=""; NC=""
fi

# Results storage
declare -a R_STATUS=()
declare -a R_CAT=()
declare -a R_CHK=()
declare -a R_DET=()
declare -a R_FIX=()

add_result() {
    R_STATUS+=("$1")
    R_CAT+=("$2")
    R_CHK+=("$3")
    R_DET+=("$4")
    R_FIX+=("$5")
    total=$((total + 1))
    case "$1" in
        PASS) pass=$((pass + 1)) ;;
        FAIL) fail=$((fail + 1)) ;;
        WARN) warn=$((warn + 1)) ;;
    esac
}

echo "${CYAN}====== OpenClaw Security Check ======${NC}"
echo "$(date)"
echo "${CYAN}===================================${NC}"
echo ""

# ===== FIND CONFIG =====
config_path=""

# 1. Linux home
if [[ -f "$HOME/.openclaw/openclaw.json" ]]; then
    config_path="$HOME/.openclaw/openclaw.json"
fi

# 2. WSL Windows paths (direct)
if [[ -z "$config_path" ]]; then
    for drive in c d e f; do
        for user in sunce user admin; do
            candidate="/mnt/${drive}/Users/${user}/.openclaw/openclaw.json"
            if [[ -f "$candidate" ]]; then
                config_path="$candidate"
                break 2
            fi
        done
    done
fi

# 3. WSL Windows paths (any user glob)
if [[ -z "$config_path" ]]; then
    for candidate in /mnt/[cdef]/Users/*/.openclaw/openclaw.json; do
        if [[ -f "$candidate" ]]; then
            config_path="$candidate"
            break
        fi
    done
fi

# 4. Windows double-slash paths
if [[ -z "$config_path" ]]; then
    for path in "//c/Users/sunce/.openclaw/openclaw.json" "//d/Users/sunce/.openclaw/openclaw.json"; do
        if [[ -f "$path" ]]; then
            config_path="$path"
            break
        fi
    done
fi

if [[ -n "$config_path" && -f "$config_path" ]]; then
    echo -e "${GREEN}[OK] Config: $config_path${NC}"
else
    echo -e "${RED}[ERROR] No OpenClaw config found${NC}"
    echo "  Run from Windows PowerShell:"
    echo "    powershell -ExecutionPolicy Bypass -File openclaw-security-check.ps1"
    echo "  Or from WSL:        "
    echo "    bash openclaw-security-check.sh"
    exit 1
fi

# ===== READ CONFIG VALUE (pure bash, no jq/grep/sed required) =====
# Reads from config_path using bash parameter expansion
read_config() {
    local key="$1"
    local default="${2:-}"
    local content
    content=$(cat "$config_path" 2>/dev/null) || { echo "$default"; return; }
    
    # Try jq first
    if command -v jq >/dev/null 2>&1; then
        local val
        val=$(echo "$content" | jq -r "$key // empty" 2>/dev/null) || { echo "$default"; return; }
        if [[ -n "$val" ]]; then
            echo "$val"
            return
        fi
    fi
    
    # Fallback: simple bash parsing (works for 1-level and 2-level keys)
    # Key: gateway.bind → look for "gateway" then "bind"
    local key1 key2
    key1=$(echo "$key" | cut -d'.' -f1)
    key2=$(echo "$key" | cut -d'.' -f2-)
    
    # Extract value using bash (handles "key": "value" and "key": true/false)
    local val=""
    local in_target=false
    local found=false
    
    while IFS= read -r line; do
        # Trim whitespace
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"
        
        # Check if we're entering the target key section
        if [[ "$line" == *"$key1"* ]] && [[ "$line" != *"$key1."* ]]; then
            in_target=true
            continue
        fi
        
        # Check for the value in the target section
        if $in_target; then
            # Look for "key2": "value" or "key2": true/false
            if [[ "$line" == "\"$key2\""* ]]; then
                # Extract value after the colon
                val="${line#*:}"
                # Remove leading whitespace
                val="${val#"${val%%[![:space:]]*}"}"
                # Remove quotes if present
                val="${val#\"}"
                val="${val%\"}"
                # Remove trailing comma
                val="${val%,}"
                found=true
                break
            fi
            # If we hit another top-level key, stop looking
            if [[ "$line" == "\""* ]] && [[ "$line" != *"$key2"* ]]; then
                break
            fi
        fi
    done <<< "$content"
    
    if $found && [[ -n "$val" ]]; then
        echo "$val"
    else
        echo "$default"
    fi
}

# ===== 1. GATEWAY SECURITY =====
echo -e "\n${GREEN}--- 1. Gateway Security ---${NC}"

bind=$(read_config ".gateway.bind" "")
auth_mode=$(read_config ".gateway.auth.mode" "")
auth_token=$(read_config ".gateway.auth.token" "")
auth_token_len=${#auth_token}
mdns_mode=$(read_config ".discovery.mdns.mode" "")
tailscale=$(read_config ".gateway.tailscale.enable" "")

if [[ "$bind" == "loopback" ]]; then
    add_result "PASS" "Gateway" "Bind" "loopback" ""
elif [[ -n "$bind" ]]; then
    add_result "WARN" "Gateway" "Bind" "Bound to: $bind" "Use loopback"
else
    add_result "FAIL" "Gateway" "Bind" "Not set" "Set gateway.bind to 'loopback'"
fi

if [[ "$auth_mode" == "token" ]]; then
    if [[ $auth_token_len -ge 32 ]]; then
        add_result "PASS" "Gateway" "Auth" "Token OK ($auth_token_len chars)" ""
    else
        add_result "FAIL" "Gateway" "Auth" "Token too short ($auth_token_len chars)" "Use >=32 char token"
    fi
elif [[ "$auth_mode" == "password" ]]; then
    add_result "PASS" "Gateway" "Auth" "Password auth" ""
elif [[ "$auth_mode" == "trusted-proxy" ]]; then
    add_result "PASS" "Gateway" "Auth" "Trusted proxy" ""
elif [[ -n "$auth_mode" ]]; then
    add_result "WARN" "Gateway" "Auth" "Unusual mode: $auth_mode" "Verify intentional"
else
    add_result "FAIL" "Gateway" "Auth" "Not set" "Set gateway.auth.mode"
fi

if [[ "$tailscale" == "true" ]]; then
    add_result "WARN" "Gateway" "Tailscale" "Enabled" "Verify ACLs"
fi

if [[ "$mdns_mode" == "full" ]]; then
    add_result "FAIL" "Gateway" "Bonjour/mDNS" "Full mode" "Use minimal or off"
elif [[ "$mdns_mode" == "minimal" || "$mdns_mode" == "off" ]]; then
    add_result "PASS" "Gateway" "Bonjour/mDNS" "$mdns_mode (safe)" ""
fi

# ===== 2. CHANNEL SECURITY =====
echo -e "\n${GREEN}--- 2. Channel Security ---${NC}"

for channel in whatsapp telegram signal discord slack msteams; do
    dm=$(read_config ".channels.$channel.dmPolicy" "")
    if [[ -n "$dm" ]]; then
        case "$dm" in
            pairing|allowlist|disabled)
                add_result "PASS" "Channel" "$channel" "DM: $dm (secure)" ""
                ;;
            open)
                add_result "FAIL" "Channel" "$channel" "DM: open (insecure)" "Use pairing or allowlist"
                ;;
            *)
                add_result "WARN" "Channel" "$channel" "DM: $dm (unusual)" "Verify intentional"
                ;;
        esac
    fi
done

# ===== 3. FILE SYSTEM SECURITY =====
echo -e "\n${GREEN}--- 3. File System Security ---${NC}"

openclaw_dir=$(dirname "$config_path")

# Check permissions (Unix style)
if [[ -d "$openclaw_dir" ]]; then
    perms=""
    if command -v stat >/dev/null 2>&1; then
        # Linux
        perms=$(stat -c "%a" "$openclaw_dir" 2>/dev/null)
    elif command -v stat >/dev/null 2>&1; then
        # macOS
        perms=$(stat -f "%Lp" "$openclaw_dir" 2>/dev/null)
    fi
    
    if [[ "$perms" == "700" ]]; then
        add_result "PASS" "FS" "Dir perms" "$perms (user-only)" ""
    elif [[ -n "$perms" && "$perms" != "000" ]]; then
        add_result "WARN" "FS" "Dir perms" "$perms" "Use 700"
    fi
fi

# Check secrets.json
secrets="$openclaw_dir/secrets.json"
if [[ -f "$secrets" ]]; then
    sec_perms=""
    if command -v stat >/dev/null 2>&1; then
        sec_perms=$(stat -c "%a" "$secrets" 2>/dev/null || stat -f "%Lp" "$secrets" 2>/dev/null)
    fi
    if [[ "$sec_perms" == "600" ]]; then
        add_result "PASS" "FS" "Secrets file" "600 (user-only)" ""
    elif [[ -n "$sec_perms" ]]; then
        add_result "WARN" "FS" "Secrets file" "Permissions: $sec_perms" "Use 600"
    fi
fi

# ===== 4. TOOL POLICY =====
echo -e "\n${GREEN}--- 4. Tool Policy ---${NC}"

exec_sec=$(read_config ".tools.exec.security" "")
elevated=$(read_config ".tools.elevated.enabled" "")
ssrf=$(read_config ".browser.ssrfPolicy.dangerouslyAllowPrivateNetwork" "")
sandbox=$(read_config ".agents.defaults.sandbox.mode" "")
ctx_vis=$(read_config ".contextVisibility" "")

if [[ "$exec_sec" == "deny" ]]; then
    add_result "PASS" "Tool" "Exec" "deny (secure)" ""
elif [[ "$exec_sec" == "full" ]]; then
    add_result "WARN" "Tool" "Exec" "full (permissive)" "Use deny or allowlist"
elif [[ "$exec_sec" == "allowlist" ]]; then
    add_result "PASS" "Tool" "Exec" "allowlist" ""
elif [[ -z "$exec_sec" ]]; then
    add_result "WARN" "Tool" "Exec" "Not set (defaults to full)" "Set explicitly"
fi

if [[ "$elevated" == "true" ]]; then
    add_result "FAIL" "Tool" "Elevated" "Enabled" "Disable unless needed"
else
    add_result "PASS" "Tool" "Elevated" "Disabled" ""
fi

if [[ "$ssrf" == "true" ]]; then
    add_result "FAIL" "Tool" "SSRF" "Private net allowed" "Set dangerouslyAllowPrivateNetwork=false"
else
    add_result "PASS" "Tool" "SSRF" "Blocked" ""
fi

if [[ "$sandbox" == "all" ]]; then
    add_result "PASS" "Tool" "Sandbox" "all (secure)" ""
elif [[ -n "$sandbox" ]]; then
    add_result "WARN" "Tool" "Sandbox" "$sandbox" "Use all"
fi

if [[ "$ctx_vis" == "allowlist" || "$ctx_vis" == "allowlist_quote" ]]; then
    add_result "PASS" "Tool" "Context" "$ctx_vis" ""
fi

# ===== 5. DANGEROUS FLAGS =====
echo -e "\n${GREEN}--- 5. Dangerous Flags ---${NC}"

declare -a flag_list=(
    "gateway.controlUi.allowInsecureAuth"
    "gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback"
    "gateway.controlUi.dangerouslyDisableDeviceAuth"
    "hooks.gmail.allowUnsafeExternalContent"
    "hooks.mappings.allowUnsafeExternalContent"
)

for flag in "${flag_list[@]}"; do
    val=$(read_config "$flag" "")
    if [[ -n "$val" && "$val" != "false" ]]; then
        add_result "FAIL" "Danger" "$flag" "Set to: $val" "Disable"
    else
        add_result "PASS" "Danger" "$flag" "Not set" ""
    fi
done

# ===== 6. MODEL HYGIENE =====
echo -e "\n${GREEN}--- 6. Model Hygiene ---${NC}"

model=$(read_config ".agents.defaults.model.primary" "")
if [[ -n "$model" ]]; then
    if [[ "$model" == *"qwen"* || "$model" == *"llama"* || "$model" == *"gpt-4"* || "$model" == *"claude"* ]]; then
        add_result "PASS" "Model" "Primary" "$model (strong)" ""
    else
        add_result "WARN" "Model" "Primary" "$model" "Use strong model"
    fi
else
    add_result "WARN" "Model" "Primary" "Not set" "Set default model"
fi

# ===== 7. NETWORK =====
echo -e "\n${GREEN}--- 7. Network ---${NC}"

if [[ "$bind" == "loopback" ]]; then
    add_result "PASS" "Network" "Bind" "loopback (secure)" ""
elif [[ -n "$bind" ]]; then
    port=$(read_config ".gateway.port" "18789")
    add_result "WARN" "Network" "Bind" "$bind:$port" "Verify firewall"
fi

# Check for firewall rules (best effort)
if command -v iptables >/dev/null 2>&1; then
    fw_rules=$(iptables -L -n 2>/dev/null | grep -c "openclaw" || echo "0")
    if [[ "$fw_rules" -gt 0 ]]; then
        add_result "PASS" "Network" "Firewall" "$fw_rules rule(s)" ""
    fi
fi

# ===== SUMMARY =====
echo -e "\n${CYAN}====== SECURITY CHECK SUMMARY ======${NC}"
echo -e "  ${GREEN}PASS:${NC}   $pass"
echo -e "  ${RED}FAIL:${NC}   $fail"
echo -e "  ${YELLOW}WARN:${NC}   $warn"
echo -e "  ${WHITE}TOTAL:${NC}  $total"
echo -e "${CYAN}===================================${NC}"
echo ""

# Show details
for ((i=0; i<${#R_STATUS[@]}; i++)); do
    status="${R_STATUS[$i]}"
    cat="${R_CAT[$i]}"
    chk="${R_CHK[$i]}"
    det="${R_DET[$i]}"
    fix="${R_FIX[$i]}"
    
    case "$status" in
        PASS) color="$GREEN" ;;
        FAIL) color="$RED" ;;
        WARN) color="$YELLOW" ;;
        *) color="$NC" ;;
    esac
    
    echo -e "  ${color}[$status]${NC} [$cat] $chk: $det"
    if [[ -n "$fix" ]]; then
        echo -e "    → Fix: $fix"
    fi
done

echo ""

# Failures
if [[ $fail -gt 0 ]]; then
    echo -e "${RED}[CRITICAL] $fail checks failed!${NC}"
    for ((i=0; i<${#R_STATUS[@]}; i++)); do
        if [[ "${R_STATUS[$i]}" == "FAIL" ]]; then
            echo -e "  [FAIL] [${R_CAT[$i]}] ${R_CHK[$i]}: ${R_DET[$i]}"
        fi
    done
    echo ""
fi

# Warnings
if [[ $warn -gt 0 ]]; then
    echo -e "${YELLOW}[WARNING] $warn checks warned:${NC}"
    for ((i=0; i<${#R_STATUS[@]}; i++)); do
        if [[ "${R_STATUS[$i]}" == "WARN" ]]; then
            echo -e "  [WARN] [${R_CAT[$i]}] ${R_CHK[$i]}: ${R_DET[$i]}"
        fi
    done
    echo ""
fi

# Score
if [[ $total -gt 0 ]]; then
    score=$(( (pass * 100) / total ))
    echo -e "${CYAN}Score: ${score}% ($pass/$total)${NC}"
    if [[ $score -ge 90 ]]; then
        echo -e "  ${GREEN}Excellent! Well-secured.${NC}"
    elif [[ $score -ge 70 ]]; then
        echo -e "  ${YELLOW}Good, some hardening recommended.${NC}"
    else
        echo -e "  ${RED}Needs attention.${NC}"
    fi
fi

echo ""
echo "Next steps:"
echo "  1. openclaw security audit --deep"
echo "  2. openclaw security audit --fix"
echo ""

exit 0
