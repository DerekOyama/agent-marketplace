# Test script to verify Prisma connection fix
# Run this to confirm the fix is working

Write-Host "🧪 Testing Prisma connection fix..." -ForegroundColor Yellow

# Test 1: Validate schema
Write-Host "1️⃣ Testing schema validation..." -ForegroundColor Cyan
try {
    $result = npx prisma validate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Schema validation passed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Schema validation failed" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
} catch {
    Write-Host "   ❌ Error during validation: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Database push (the problematic command)
Write-Host "2️⃣ Testing database push..." -ForegroundColor Cyan
try {
    $startTime = Get-Date
    $result = npx prisma db push --skip-generate 2>&1
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Database push completed in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Database push failed" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
} catch {
    Write-Host "   ❌ Error during database push: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Check connection string
Write-Host "3️⃣ Checking connection configuration..." -ForegroundColor Cyan
$envContent = Get-Content ".env" -ErrorAction SilentlyContinue
if ($envContent -match 'POSTGRES_PRISMA_URL="postgres://[^"]*5432/postgres\?sslmode=require"') {
    Write-Host "   ✅ Using non-pooling connection (port 5432)" -ForegroundColor Green
} elseif ($envContent -match 'pgbouncer=true') {
    Write-Host "   ❌ Still using pgbouncer connection - fix needed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   ⚠️  Could not verify connection type" -ForegroundColor Yellow
}

Write-Host "🎉 All tests passed! Prisma connection fix is working correctly." -ForegroundColor Green
