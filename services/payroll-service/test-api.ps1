param()

$BASE_URL = "http://localhost:4005"
$SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   PAYROLL SERVICE - MANUAL API TEST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1] Health Check" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
$res | ConvertTo-Json

Write-Host "`n[2] Auth - No Service Key (expect 403)" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches" -Method Get
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n[3] Create Payroll Batch" -ForegroundColor Yellow
$body = @{
    employerId = "usr_employer_001"
    employerWalletId = "wal_employer_001"
    name = "August 2026 Salaries"
    currency = "PKR"
    idempotencyKey = "iky_payroll_aug2026"
    items = @(
        @{ employeeId = "usr_emp_001"; employeeWalletId = "wal_emp_001"; amountMinor = 50000 }
        @{ employeeId = "usr_emp_002"; employeeWalletId = "wal_emp_002"; amountMinor = 60000 }
        @{ employeeId = "usr_emp_003"; employeeWalletId = "wal_emp_003"; amountMinor = 75000 }
    )
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[4] Get Batch Details" -ForegroundColor Yellow
$batchId = $res.data.batchId
$res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches/$batchId" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[5] Get Batch Items" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches/$batchId/items" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[6] Get Batch Stats" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches/$batchId/stats" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json

Write-Host "`n[7] Get Recent Batches" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches?limit=5" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[8] Empty Items (expect 400)" -ForegroundColor Yellow
$body = @{
    employerId = "usr_employer"
    employerWalletId = "wal_employer"
    name = "Test"
    currency = "PKR"
    idempotencyKey = "iky_empty"
    items = @()
} | ConvertTo-Json -Depth 5

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/payroll/batches" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
