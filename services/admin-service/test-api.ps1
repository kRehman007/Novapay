param()

$BASE_URL = "http://localhost:4006"
$SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ADMIN SERVICE - MANUAL API TEST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1] Health Check" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
$res | ConvertTo-Json

Write-Host "`n[2] Auth - No Service Key (expect 403)" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/dashboard" -Method Get
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n[3] Get Dashboard" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/dashboard" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[4] Create Dispute" -ForegroundColor Yellow
$body = @{
    transactionId = "txn_test123"
    userId = "usr_test"
    type = "DUPLICATE_CHARGE"
    description = "Charged twice for same payment"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/disputes" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[5] Get Disputes" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/disputes" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[6] Create Alert" -ForegroundColor Yellow
$body = @{
    type = "INVARIANT_VIOLATION"
    severity = "CRITICAL"
    message = "Debit != Credit detected in transaction"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/alerts" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[7] Get Alerts" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/alerts" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[8] Generate Report" -ForegroundColor Yellow
$body = @{
    type = "DAILY_SUMMARY"
    generatedBy = "admin"
    parameters = @{ date = "2026-08-30" }
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/reports" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[9] Get Reports" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/admin/reports" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
