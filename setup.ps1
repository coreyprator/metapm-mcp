# metapm-mcp/setup.ps1 (HO-U9V0)
# Install, build, and configure MetaPM MCP server for Claude Desktop
#
# Usage: .\setup.ps1

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot
$configSource = Join-Path $projectDir "claude_desktop_config.example.json"
$claudeConfigDir = Join-Path $env:APPDATA "Claude"
$claudeConfigPath = Join-Path $claudeConfigDir "claude_desktop_config.json"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MetaPM MCP Server Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Install dependencies
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
Push-Location $projectDir
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [X] npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
Pop-Location

# 2. Build TypeScript
Write-Host "[2/4] Building TypeScript..." -ForegroundColor Yellow
Push-Location $projectDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [X] Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  [OK] Built to dist/" -ForegroundColor Green
Pop-Location

# 3. Configure Claude Desktop
Write-Host "[3/4] Configuring Claude Desktop..." -ForegroundColor Yellow

if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    Write-Host "  Created $claudeConfigDir" -ForegroundColor Gray
}

if (Test-Path $claudeConfigPath) {
    $backupPath = "$claudeConfigPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $claudeConfigPath $backupPath
    Write-Host "  [OK] Backed up existing config to $backupPath" -ForegroundColor Green
}

# Read example config and replace placeholder API key
$configContent = Get-Content $configSource -Raw

# Check if user has API key in env
$apiKey = $env:METAPM_API_KEY
if ($apiKey) {
    $configContent = $configContent -replace '"METAPM_API_KEY": ""', "`"METAPM_API_KEY`": `"$apiKey`""
    Write-Host "  [OK] API key set from environment" -ForegroundColor Green
} else {
    Write-Host "  [!] No METAPM_API_KEY set - some tools may need auth" -ForegroundColor Yellow
}

Set-Content -Path $claudeConfigPath -Value $configContent
Write-Host "  [OK] Config written to $claudeConfigPath" -ForegroundColor Green

# 4. Run tests
Write-Host "[4/4] Running API tests..." -ForegroundColor Yellow
Push-Location $projectDir
node dist/test_mcp.js
Pop-Location

# Done
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor Gray
Write-Host "  Next steps:" -ForegroundColor Gray
Write-Host "  1. Restart Claude Desktop" -ForegroundColor Gray
Write-Host "  2. Ask Claude: 'List recent handoffs'" -ForegroundColor Gray
Write-Host "  3. Ask Claude: 'What is the conductor status?'" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
