param()

$BASE_URL = "http://localhost:4004"
$SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   FX SERVICE - MANUAL API TEST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1] Health Check" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
$res | ConvertTo-Json

Write-Host "`n[2] Auth - No Service Key (expect 403)" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/rate/USD/EUR" -Method Get
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n[3] Get Exchange Rate" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/rate/USD/EUR" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json

Write-Host "`n[4] Create FX Quote" -ForegroundColor Yellow
$body = @{
    sourceCurrency = "USD"
    targetCurrency = "EUR"
    sourceAmountMinor = 10000
    userId = "usr_test"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/quote" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[5] Get Quote Details" -ForegroundColor Yellow
$quoteId = $res.data.quoteId
$res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/quote/$quoteId" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[6] Validate Quote" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/quote/$quoteId/validate" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[7] Mark Quote as Used" -ForegroundColor Yellow
$body = @{ transactionId = "txn_test123" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/quote/$quoteId/use" -Method Put -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[8] Same Currencies (expect 400)" -ForegroundColor Yellow
$body = @{
    sourceCurrency = "USD"
    targetCurrency = "USD"
    sourceAmountMinor = 10000
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/quote" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n[9] Get Recent Quotes" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/fx/quotes?limit=5" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
