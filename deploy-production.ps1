#!/usr/bin/env pwsh
# Safe Production Deployment Script
# This script deploys Convex functions and syncs base/station data to production

Write-Host "🚀 SkautREG Production Deployment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Confirm deployment
Write-Host "⚠️  WARNING: This will deploy to PRODUCTION" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Type 'DEPLOY' to continue"
if ($confirm -ne "DEPLOY") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 1
}

# Step 2: Check for uncommitted changes
Write-Host ""
Write-Host "📋 Checking git status..." -ForegroundColor Blue
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $continueAnyway = Read-Host "Continue anyway? (y/N)"
    if ($continueAnyway -ne "y") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Deploy Convex functions
Write-Host ""
Write-Host "📦 Deploying Convex functions to production..." -ForegroundColor Blue
Write-Host ""

npx convex deploy --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Convex deployment failed!" -ForegroundColor Red
    Write-Host "Please fix errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Convex functions deployed successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Ask about data sync
Write-Host "📊 Data Sync Options:" -ForegroundColor Blue
Write-Host "  1. Sync bases and stations now (recommended for first deployment)"
Write-Host "  2. Skip sync (functions deployed only)"
Write-Host ""
$syncChoice = Read-Host "Choose option (1/2)"

if ($syncChoice -eq "1") {
    Write-Host ""
    Write-Host "🔄 Syncing bases and stations to production..." -ForegroundColor Blue
    Write-Host "This will take 20-30 minutes for all 371 bases..." -ForegroundColor Yellow
    Write-Host ""
    
    # Ensure we're targeting production deployment
    $env:NODE_ENV = "production"
    
    npm run sync:prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "⚠️  Sync encountered errors!" -ForegroundColor Yellow
        Write-Host "Check logs above for details. Some bases may have failed." -ForegroundColor Yellow
        Write-Host ""
        $checkData = Read-Host "Continue to verify data? (Y/n)"
        if ($checkData -eq "n") {
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "✅ Base and station sync completed!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🔍 Verification steps:" -ForegroundColor Blue
    Write-Host "  1. Open Convex dashboard: https://dashboard.convex.dev"
    Write-Host "  2. Go to Data → bases table"
    Write-Host "  3. Verify you see ~371 bases"
    Write-Host "  4. Open any base record"
    Write-Host "  5. Check that it has enriched data (contacts, photos, etc.)"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⏭️  Skipping data sync" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To sync data later, run:" -ForegroundColor Blue
    Write-Host "  npm run sync:prod" -ForegroundColor Cyan
    Write-Host ""
}

# Step 5: Deployment summary
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✨ Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "  1. Test your production app"
Write-Host "  2. Monitor Convex logs for any errors"
Write-Host "  3. Verify bases appear in BaseFinder"
Write-Host ""
Write-Host "Dashboard: https://dashboard.convex.dev" -ForegroundColor Cyan
Write-Host ""
