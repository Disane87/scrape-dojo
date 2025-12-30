# Generate OpenAPI Specification Script
Write-Host "Generating OpenAPI specification..." -ForegroundColor Cyan

# Build API first
Write-Host "Building API..." -ForegroundColor Yellow
pnpm nx build api

if ($LASTEXITCODE -ne 0) {
    Write-Host "API build failed" -ForegroundColor Red
    exit 1
}

# Start API in background with OpenAPI export flag
Write-Host "Starting API server..." -ForegroundColor Yellow
$env:EXPORT_OPENAPI = "true"
$apiProcess = Start-Process -FilePath "pnpm" -ArgumentList "start:api" -PassThru -WindowStyle Hidden

# Wait for API to be ready
Write-Host "Waiting for API to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Download OpenAPI JSON
try {
    Write-Host "Downloading OpenAPI spec..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "http://localhost:3000/api-json" -OutFile "apps\api\openapi.json"
    Write-Host "OpenAPI specification saved to apps\api\openapi.json" -ForegroundColor Green
} catch {
    Write-Host "Failed to download OpenAPI spec: $_" -ForegroundColor Red
    Stop-Process -Id $apiProcess.Id -Force
    exit 1
}

# Stop API server
Write-Host "Stopping API server..." -ForegroundColor Yellow
Stop-Process -Id $apiProcess.Id -Force

Write-Host "Done!" -ForegroundColor Green
