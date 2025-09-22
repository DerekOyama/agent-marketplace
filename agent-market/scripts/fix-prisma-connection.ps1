# Fix Prisma connection for schema operations
# This script ensures POSTGRES_PRISMA_URL uses non-pooling connection

Write-Host "🔧 Fixing Prisma connection configuration..." -ForegroundColor Yellow

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

# Backup current .env
Copy-Item ".env" ".env.backup" -Force
Write-Host "✅ Backed up .env to .env.backup" -ForegroundColor Green

# Fix POSTGRES_PRISMA_URL to use non-pooling connection
$envContent = Get-Content ".env"
$fixedContent = $envContent -replace 
    'POSTGRES_PRISMA_URL="postgres://[^"]*pgbouncer=true"',
    'POSTGRES_PRISMA_URL="postgres://postgres.zylecdygdhgyopynafiz:-U7g9LHiqm7NDNn@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"'

Set-Content ".env" $fixedContent
Write-Host "✅ Updated POSTGRES_PRISMA_URL to use non-pooling connection" -ForegroundColor Green

# Test the connection
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

Write-Host "🎉 Prisma connection fix complete!" -ForegroundColor Green
