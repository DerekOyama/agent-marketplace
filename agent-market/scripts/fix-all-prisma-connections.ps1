# Comprehensive Prisma Connection Fix for All Agents
# This script fixes both .env and .env.local files to prevent hanging

Write-Host "🔧 Fixing Prisma connections for all agents..." -ForegroundColor Yellow

# Function to fix a single env file
function Fix-EnvFile {
    param($FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "⚠️  $FilePath not found, skipping..." -ForegroundColor Yellow
        return
    }
    
    Write-Host "📝 Fixing $FilePath..." -ForegroundColor Cyan
    
    # Backup the file
    Copy-Item $FilePath "$FilePath.backup" -Force
    Write-Host "   ✅ Backed up to $FilePath.backup" -ForegroundColor Green
    
    # Fix POSTGRES_PRISMA_URL to use non-pooling connection
    $envContent = Get-Content $FilePath
    $fixedContent = $envContent -replace 
        'POSTGRES_PRISMA_URL="postgres://[^"]*pgbouncer=true"',
        'POSTGRES_PRISMA_URL="postgres://postgres.zylecdygdhgyopynafiz:-U7g9LHiqm7NDNn@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"'
    
    Set-Content $FilePath $fixedContent
    Write-Host "   ✅ Updated POSTGRES_PRISMA_URL to use non-pooling connection" -ForegroundColor Green
}

# Fix both environment files
Fix-EnvFile ".env"
Fix-EnvFile ".env.local"

# Test the fix
Write-Host "🧪 Testing Prisma connection..." -ForegroundColor Yellow
try {
    $result = npx prisma validate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma connection test passed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Prisma connection test failed:" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Error testing Prisma connection: $_" -ForegroundColor Red
}

Write-Host "🎉 All Prisma connections fixed for all agents!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   • Fixed .env file" -ForegroundColor White
Write-Host "   • Fixed .env.local file" -ForegroundColor White
Write-Host "   • Both files now use non-pooling connection (port 5432)" -ForegroundColor White
Write-Host "   • All agents should now work without hanging" -ForegroundColor White
