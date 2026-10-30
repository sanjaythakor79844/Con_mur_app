# Vercel Environment Variables Import Script (PowerShell)
# Usage: .\vercel-import-env.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Vercel Environment Variables Import" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✓ Vercel CLI installed: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Vercel CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Vercel CLI:" -ForegroundColor Yellow
    Write-Host "npm install -g vercel" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Step 1: Login to Vercel" -ForegroundColor Yellow
Write-Host "Running: vercel login" -ForegroundColor Gray
vercel login

Write-Host ""
Write-Host "Step 2: Link Project" -ForegroundColor Yellow
Write-Host "Running: vercel link" -ForegroundColor Gray
vercel link

Write-Host ""
Write-Host "Step 3: Import Environment Variables" -ForegroundColor Yellow
Write-Host ""

# Read .env.vercel file
if (-Not (Test-Path ".env.vercel")) {
    Write-Host "✗ .env.vercel file not found!" -ForegroundColor Red
    exit 1
}

$envVars = Get-Content ".env.vercel" | Where-Object { $_ -match "^VITE_" }

Write-Host "Found $($envVars.Count) environment variables to import:" -ForegroundColor Cyan
Write-Host ""

foreach ($line in $envVars) {
    if ($line -match "^(VITE_[^=]+)=(.+)$") {
        $varName = $matches[1]
        $varValue = $matches[2]
        
        Write-Host "→ $varName" -ForegroundColor White
        
        # Add to production
        Write-Host "  Adding to Production..." -ForegroundColor Gray
        echo $varValue | vercel env add $varName production
        
        # Add to preview
        Write-Host "  Adding to Preview..." -ForegroundColor Gray
        echo $varValue | vercel env add $varName preview
        
        # Add to development
        Write-Host "  Adding to Development..." -ForegroundColor Gray
        echo $varValue | vercel env add $varName development
        
        Write-Host "  ✓ Added $varName" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✓ All environment variables imported!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Deploy your project: vercel --prod" -ForegroundColor White
Write-Host "2. Verify in dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "3. Update Firebase Console with Vercel domain" -ForegroundColor White
Write-Host "4. Update GCS CORS configuration" -ForegroundColor White
Write-Host ""
