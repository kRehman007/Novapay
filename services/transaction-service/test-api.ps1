# Transaction Service - API Test Script (PowerShell)

$BASE_URL = "http://localhost:4002/api"
$ACCOUNT_URL = "http://localhost:4001/api"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  TRANSACTION SERVICE - API TEST SCRIPT" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1] Health Check" -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:4002/health" -Method GET | ConvertTo-Json

# 2. Setup - Get or create users and wallets
Write-Host "`n[2] Setup - Getting auth token and wallets" -ForegroundColor Yellow

# Create users if not exist
$createUser1Body = @{
    email = "sender@test.com"
    password = "password123"
    firstName = "Sender"
    lastName = "User"
} | ConvertTo-Json

try {
    $user1Response = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts" -Method POST -Body $createUser1Body -ContentType "application/json"
    $SENDER_ID = $user1Response.data.userId
    Write-Host "Created Sender: $SENDER_ID" -ForegroundColor Green
} catch {
    Write-Host "Sender may already exist, trying to auth..." -ForegroundColor Yellow
}

$createUser2Body = @{
    email = "receiver@test.com"
    password = "password123"
    firstName = "Receiver"
    lastName = "User"
} | ConvertTo-Json

try {
    $user2Response = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts" -Method POST -Body $createUser2Body -ContentType "application/json"
    $RECEIVER_ID = $user2Response.data.userId
    Write-Host "Created Receiver: $RECEIVER_ID" -ForegroundColor Green
} catch {
    Write-Host "Receiver may already exist, trying to auth..." -ForegroundColor Yellow
}

# Authenticate sender
$authBody = @{
    email = "sender@test.com"
    password = "password123"
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts/auth" -Method POST -Body $authBody -ContentType "application/json"
$SENDER_TOKEN = $authResponse.data.token
Write-Host "Got sender token" -ForegroundColor Green

# Authenticate receiver
$auth2Body = @{
    email = "receiver@test.com"
    password = "password123"
} | ConvertTo-Json

$auth2Response = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts/auth" -Method POST -Body $auth2Body -ContentType "application/json"
$RECEIVER_TOKEN = $auth2Response.data.token
Write-Host "Got receiver token" -ForegroundColor Green

# Create wallets
$senderHeaders = @{ Authorization = "Bearer $SENDER_TOKEN" }
$receiverHeaders = @{ Authorization = "Bearer $RECEIVER_TOKEN" }

try {
    $wallet1Body = @{ currency = "USD" } | ConvertTo-Json
    $wallet1Response = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts/$SENDER_ID/wallets" -Method POST -Body $wallet1Body -ContentType "application/json" -Headers $senderHeaders
    $SENDER_WALLET = $wallet1Response.data.walletId
    Write-Host "Created Sender Wallet: $SENDER_WALLET" -ForegroundColor Green
} catch {
    Write-Host "Sender wallet may already exist" -ForegroundColor Yellow
}

try {
    $wallet2Body = @{ currency = "USD" } | ConvertTo-Json
    $wallet2Response = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts/$RECEIVER_ID/wallets" -Method POST -Body $wallet2Body -ContentType "application/json" -Headers $receiverHeaders
    $RECEIVER_WALLET = $wallet2Response.data.walletId
    Write-Host "Created Receiver Wallet: $RECEIVER_WALLET" -ForegroundColor Green
} catch {
    Write-Host "Receiver wallet may already exist" -ForegroundColor Yellow
}

# If wallets not created, try to get them
if (-not $SENDER_WALLET) {
    $senderWallets = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts/$SENDER_ID/wallets" -Method GET -Headers $senderHeaders
    $SENDER_WALLET = $senderWallets.data[0].walletId
    Write-Host "Got Sender Wallet: $SENDER_WALLET" -ForegroundColor Green
}

if (-not $RECEIVER_WALLET) {
    $receiverWallets = Invoke-RestMethod -Uri "$ACCOUNT_URL/accounts/$RECEIVER_ID/wallets" -Method GET -Headers $receiverHeaders
    $RECEIVER_WALLET = $receiverWallets.data[0].walletId
    Write-Host "Got Receiver Wallet: $RECEIVER_WALLET" -ForegroundColor Green
}

Write-Host "`nSetup Complete:" -ForegroundColor Green
Write-Host "  Sender ID: $SENDER_ID"
Write-Host "  Sender Wallet: $SENDER_WALLET"
Write-Host "  Receiver ID: $RECEIVER_ID"
Write-Host "  Receiver Wallet: $RECEIVER_WALLET"

# 3. Create Domestic Transfer
Write-Host "`n[3] Create Domestic Transfer" -ForegroundColor Yellow
$transferBody = @{
    senderWalletId = $SENDER_WALLET
    senderUserId = $SENDER_ID
    receiverWalletId = $RECEIVER_WALLET
    receiverUserId = $RECEIVER_ID
    amountMinor = 1000
    currency = "USD"
    idempotencyKey = "key_transfer_001"
    description = "Test transfer"
} | ConvertTo-Json

$transferResponse = Invoke-RestMethod -Uri "$BASE_URL/transfers/domestic" -Method POST -Body $transferBody -ContentType "application/json" -Headers $senderHeaders
$transferResponse | ConvertTo-Json -Depth 3
$TRANSFER_ID = $transferResponse.data.transactionId
Write-Host "Created Transfer: $TRANSFER_ID" -ForegroundColor Green

# 4. Test Idempotency - Same key should return same result
Write-Host "`n[4] Test Idempotency (Same Key)" -ForegroundColor Yellow
$transferResponse2 = Invoke-RestMethod -Uri "$BASE_URL/transfers/domestic" -Method POST -Body $transferBody -ContentType "application/json" -Headers $senderHeaders
$transferResponse2 | ConvertTo-Json -Depth 3

if ($transferResponse2.data.transactionId -eq $TRANSFER_ID) {
    Write-Host "Idempotency working! Same transaction ID returned." -ForegroundColor Green
} else {
    Write-Host "Idempotency FAILED! Different transaction ID returned." -ForegroundColor Red
}

# 5. Test Idempotency Mismatch - Same key, different payload
Write-Host "`n[5] Test Idempotency Mismatch (Same Key, Different Amount)" -ForegroundColor Yellow
$mismatchBody = @{
    senderWalletId = $SENDER_WALLET
    senderUserId = $SENDER_ID
    receiverWalletId = $RECEIVER_WALLET
    receiverUserId = $RECEIVER_ID
    amountMinor = 2000
    currency = "USD"
    idempotencyKey = "key_transfer_001"
    description = "Test transfer"
} | ConvertTo-Json

try {
    $mismatchResponse = Invoke-RestMethod -Uri "$BASE_URL/transfers/domestic" -Method POST -Body $mismatchBody -ContentType "application/json" -Headers $senderHeaders
    $mismatchResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Get Transfer
Write-Host "`n[6] Get Transfer" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/transfers/$TRANSFER_ID" -Method GET -Headers $senderHeaders | ConvertTo-Json -Depth 3

# 7. Get User Transfers
Write-Host "`n[7] Get User Transfers" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/transfers/user/$SENDER_ID" -Method GET -Headers $senderHeaders | ConvertTo-Json -Depth 3

# 8. Reverse Transfer
Write-Host "`n[8] Reverse Transfer" -ForegroundColor Yellow
$reverseBody = @{
    reason = "Customer request - duplicate charge"
} | ConvertTo-Json

$reverseResponse = Invoke-RestMethod -Uri "$BASE_URL/transfers/$TRANSFER_ID/reverse" -Method POST -Body $reverseBody -ContentType "application/json" -Headers $senderHeaders
$reverseResponse | ConvertTo-Json -Depth 3

# 9. Get Pending Transfers (Service-to-Service)
Write-Host "`n[9] Get Pending Transfers (Service-to-Service)" -ForegroundColor Yellow
$serviceHeaders = @{ "X-Service-Key" = "test-service-key" }
Invoke-RestMethod -Uri "$BASE_URL/transfers/pending" -Method GET -Headers $serviceHeaders | ConvertTo-Json -Depth 3

# 10. Test Recovery
Write-Host "`n[10] Test Recovery" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/transfers/recovery" -Method POST -Headers $serviceHeaders | ConvertTo-Json -Depth 3

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS COMPLETED!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "`nIDs for reference:" -ForegroundColor Yellow
Write-Host "  Transfer ID: $TRANSFER_ID"
