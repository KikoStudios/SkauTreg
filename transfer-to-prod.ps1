#!/usr/bin/env pwsh
# Transfer bases and stations data from dev to production
# This script exports from dev, deploys functions, then imports to prod

Write-Host "Transfer Data to Production" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Export data from dev
Write-Host "Step 1: Exporting bases and stations from dev..." -ForegroundColor Blue
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$exportPath = "convex_export_$timestamp"

# Export from dev deployment
npx convex export --path $exportPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Export failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Export completed: $exportPath" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Convex functions to production
Write-Host "Step 2: Deploying Convex functions to production..." -ForegroundColor Blue
Write-Host ""

npx convex deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host "Export saved at: $exportPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Functions deployed to production!" -ForegroundColor Green
Write-Host ""

# Step 3: Confirm import
Write-Host "Step 3: Import data to production" -ForegroundColor Blue
Write-Host ""
Write-Host "WARNING: This will import bases and stations to PRODUCTION" -ForegroundColor Yellow
Write-Host "Export location: $exportPath" -ForegroundColor Cyan
Write-Host ""
$confirm = Read-Host "Type 'IMPORT' to continue"

if ($confirm -ne "IMPORT") {
    Write-Host ""
    Write-Host "Import cancelled" -ForegroundColor Red
    Write-Host "Export saved at: $exportPath (you can import manually later)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Importing to production..." -ForegroundColor Blue

# Import to production
npx convex import --prod $exportPath

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Import failed!" -ForegroundColor Red
    Write-Host "Export saved at: $exportPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Data imported to production!" -ForegroundColor Green
Write-Host ""

# Step 4: Summary
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Transfer Complete!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Transferred:" -ForegroundColor Blue
Write-Host "  - Bases table (with enriched data)"
Write-Host "  - Stations table"
Write-Host "  - Base-Station links"
Write-Host "  - All Convex functions"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "  1. Open Convex Dashboard: https://dashboard.convex.dev"
Write-Host "  2. Verify production data in bases table"
Write-Host "  3. Test your production app"
Write-Host ""
Write-Host "Export backup saved at: $exportPath" -ForegroundColor Cyan
Write-Host ""
