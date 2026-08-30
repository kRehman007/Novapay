# Account Service - API Test Script (PowerShell)

$BASE_URL = "http://localhost:4001/api"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ACCOUNT SERVICE - API TEST SCRIPT" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1] Health Check" -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:4001/health" -Method GET | ConvertTo-Json

# 2. Create User
Write-Host "`n[2] Create User" -ForegroundColor Yellow
$createUserBody = @{
    email = "john@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
    phone = "+1234567890"
} | ConvertTo-Json

$createUserResponse = Invoke-RestMethod -Uri "$BASE_URL/accounts" -Method POST -Body $createUserBody -ContentType "application/json"
$createUserResponse | ConvertTo-Json -Depth 3
$USER_ID = $createUserResponse.data.userId
Write-Host "Created User ID: $USER_ID" -ForegroundColor Green

# 3. Create Second User (for transfer testing later)
Write-Host "`n[3] Create Second User" -ForegroundColor Yellow
$createUser2Body = @{
    email = "jane@example.com"
    password = "password123"
    firstName = "Jane"
    lastName = "Smith"
} | ConvertTo-Json

$createUser2Response = Invoke-RestMethod -Uri "$BASE_URL/accounts" -Method POST -Body $createUser2Body -ContentType "application/json"
$createUser2Response | ConvertTo-Json -Depth 3
$USER2_ID = $createUser2Response.data.userId
Write-Host "Created Second User ID: $USER2_ID" -ForegroundColor Green

# 4. Authenticate User
Write-Host "`n[4] Authenticate User" -ForegroundColor Yellow
$authBody = @{
    email = "john@example.com"
    password = "password123"
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "$BASE_URL/accounts/auth" -Method POST -Body $authBody -ContentType "application/json"
$authResponse | ConvertTo-Json -Depth 3
$TOKEN = $authResponse.data.token
Write-Host "JWT Token: $($TOKEN.Substring(0, 50))..." -ForegroundColor Green

# 5. Get User Profile
Write-Host "`n[5] Get User Profile" -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $TOKEN" }
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID" -Method GET -Headers $headers | ConvertTo-Json -Depth 3

# 6. Update User
Write-Host "`n[6] Update User" -ForegroundColor Yellow
$updateBody = @{
    firstName = "John Updated"
    phone = "+9876543210"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers | ConvertTo-Json -Depth 3

# 7. Create Wallet (USD)
Write-Host "`n[7] Create Wallet (USD)" -ForegroundColor Yellow
$walletBody = @{ currency = "USD" } | ConvertTo-Json
$walletResponse = Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/wallets" -Method POST -Body $walletBody -ContentType "application/json" -Headers $headers
$walletResponse | ConvertTo-Json -Depth 3
$WALLET_ID = $walletResponse.data.walletId
Write-Host "Created Wallet ID: $WALLET_ID" -ForegroundColor Green

# 8. Create Wallet (EUR)
Write-Host "`n[8] Create Wallet (EUR)" -ForegroundColor Yellow
$walletEURBody = @{ currency = "EUR" } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/wallets" -Method POST -Body $walletEURBody -ContentType "application/json" -Headers $headers | ConvertTo-Json -Depth 3

# 9. Get All Wallets
Write-Host "`n[9] Get All Wallets" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/wallets" -Method GET -Headers $headers | ConvertTo-Json -Depth 3

# 10. Get Balance
Write-Host "`n[10] Get Balance (USD)" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/balance?currency=USD" -Method GET -Headers $headers | ConvertTo-Json -Depth 3

# 11. Validate Wallets (Service-to-Service)
Write-Host "`n[11] Validate Wallets (Service-to-Service)" -ForegroundColor Yellow
$validateBody = @{
    walletIds = @($WALLET_ID, "wal_nonexistent")
} | ConvertTo-Json

$serviceHeaders = @{ "X-Service-Key" = "test-service-key" }
Invoke-RestMethod -Uri "$BASE_URL/accounts/validate" -Method POST -Body $validateBody -ContentType "application/json" -Headers $serviceHeaders | ConvertTo-Json -Depth 3

# 12. Submit KYC
Write-Host "`n[12] Submit KYC" -ForegroundColor Yellow
$kycBody = @{
    documentType = "PASSPORT"
    documentNumber = "AB1234567"
    documentFrontUrl = "https://example.com/front.jpg"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/kyc" -Method POST -Body $kycBody -ContentType "application/json" -Headers $headers | ConvertTo-Json -Depth 3

# 13. Get KYC Status
Write-Host "`n[13] Get KYC Status" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/kyc" -Method GET -Headers $headers | ConvertTo-Json -Depth 3

# 14. Freeze Account
Write-Host "`n[14] Freeze Account" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/freeze" -Method PUT -Headers $headers | ConvertTo-Json -Depth 3

# 15. Try to Get Balance (should fail - account frozen)
Write-Host "`n[15] Try Get Balance (Account Frozen - Should Fail)" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/balance?currency=USD" -Method GET -Headers $headers | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 16. Unfreeze Account
Write-Host "`n[16] Unfreeze Account" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/unfreeze" -Method PUT -Headers $headers | ConvertTo-Json -Depth 3

# 17. Get Balance After Unfreeze
Write-Host "`n[17] Get Balance After Unfreeze" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID/balance?currency=USD" -Method GET -Headers $headers | ConvertTo-Json -Depth 3

# 18. Test Duplicate Email (Should Fail)
Write-Host "`n[18] Test Duplicate Email (Should Fail)" -ForegroundColor Yellow
$duplicateBody = @{
    email = "john@example.com"
    password = "password123"
    firstName = "Duplicate"
    lastName = "User"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BASE_URL/accounts" -Method POST -Body $duplicateBody -ContentType "application/json" | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 19. Test Wrong Password (Should Fail)
Write-Host "`n[19] Test Wrong Password (Should Fail)" -ForegroundColor Yellow
$wrongPassBody = @{
    email = "john@example.com"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BASE_URL/accounts/auth" -Method POST -Body $wrongPassBody -ContentType "application/json" | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 20. Test Missing Token (Should Fail)
Write-Host "`n[20] Test Missing Token (Should Fail)" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$BASE_URL/accounts/$USER_ID" -Method GET | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS COMPLETED!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "`nImportant IDs for Transaction Service testing:" -ForegroundColor Yellow
Write-Host "  User 1 ID: $USER_ID"
Write-Host "  User 2 ID: $USER2_ID"
Write-Host "  Wallet ID: $WALLET_ID"
