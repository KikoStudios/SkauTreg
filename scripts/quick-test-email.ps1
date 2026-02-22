# PowerShell version of quick test script for Windows
# Quick Test Script for Seznam/Centrum Email Verification

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  SkauTreg Email Integration Quick Test" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will guide you through testing Seznam and Centrum"
Write-Host "email integrations."
Write-Host ""
Write-Host "Before starting, make sure you have:"
Write-Host "  1. Created an email account (Seznam or Centrum)"
Write-Host "  2. Generated an APP PASSWORD for that account"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Prompt for provider
$provider = Read-Host "Which provider to test? (seznam/centrum)"

# Validate provider
if ($provider -ne "seznam" -and $provider -ne "centrum") {
    Write-Host "❌ Invalid provider. Must be 'seznam' or 'centrum'" -ForegroundColor Red
    exit 1
}

# Prompt for email
$email = Read-Host "Enter your email address"

# Prompt for app password (secure)
$passwordSecure = Read-Host "Enter your APP PASSWORD" -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
)

Write-Host ""

# Ask if they want to send test email
$sendTest = Read-Host "Send test email? (y/n)"
$sendTo = ""

if ($sendTest -eq "y" -or $sendTest -eq "Y") {
    $sendTo = Read-Host "Send to email"
}

# Construct command
$cmd = "node scripts/verify-email-providers.mjs --provider=$provider --email=$email --password=$password"

if ($sendTo) {
    $cmd += " --send-to=$sendTo"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Running verification..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Run the command
Invoke-Expression $cmd

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test complete!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
