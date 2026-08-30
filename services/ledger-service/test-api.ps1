 param()

$BASE_URL = "http://localhost:4003"
$SERVICE_KEY = "test-service-key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   LEDGER SERVICE - MANUAL API TEST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1] Health Check" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
$res | ConvertTo-Json

Write-Host "`n[2] Auth - No Service Key (expect 403)" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/transactions" -Method Get
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n[3] Create Balanced Ledger Entries" -ForegroundColor Yellow
$body = @{
    transactionId = "txn_manual_001"
    type = "TRANSFER"
    entries = @(
        @{ accountId = "wal_sender_001"; entryType = "DEBIT"; amountMinor = 25000; currency = "USD" }
        @{ accountId = "wal_receiver_001"; entryType = "CREDIT"; amountMinor = 25000; currency = "USD" }
    )
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/entries" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[4] Create FX Ledger Entries" -ForegroundColor Yellow
$body = @{
    transactionId = "txn_manual_002"
    type = "FX_TRANSFER"
    entries = @(
        @{ accountId = "wal_usd_001"; entryType = "DEBIT"; amountMinor = 10000; currency = "USD"; fxRate = 0.92 }
        @{ accountId = "wal_eur_001"; entryType = "CREDIT"; amountMinor = 9200; currency = "EUR"; fxRate = 0.92 }
    )
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/entries" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[5] Get Entries by Transaction" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/entries/txn_manual_001" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[6] Get Account Balance" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/account/wal_sender_001/balance?currency=USD" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json

Write-Host "`n[7] Get Recent Transactions" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/transactions?limit=5" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[8] Verify Audit Log Integrity" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/integrity" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json

Write-Host "`n[9] Get Audit Logs" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/audit-logs?limit=10" -Method Get -Headers @{"X-Service-Key"=$SERVICE_KEY}
$res | ConvertTo-Json -Depth 5

Write-Host "`n[10] Unbalanced Entries (expect 400)" -ForegroundColor Yellow
$body = @{
    transactionId = "txn_manual_003"
    type = "TRANSFER"
    entries = @(
        @{ accountId = "wal_a"; entryType = "DEBIT"; amountMinor = 10000; currency = "USD" }
        @{ accountId = "wal_b"; entryType = "CREDIT"; amountMinor = 5000; currency = "USD" }
    )
} | ConvertTo-Json -Depth 5

try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/ledger/entries" -Method Post -Body $body -ContentType "application/json" -Headers @{"X-Service-Key"=$SERVICE_KEY}
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
