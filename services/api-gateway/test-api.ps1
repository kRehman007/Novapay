param()

$BASE_URL = "http://localhost:4000"
$ACCOUNT_URL = "http://localhost:4001"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   API GATEWAY - MANUAL API TEST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1] Health Check" -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
$res | ConvertTo-Json -Depth 5

Write-Host "`n[2] Auth - No Token (expect 401)" -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/accounts/usr_test" -Method Get
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n[3] Create Test User (Account Service)" -ForegroundColor Yellow
$body = @{
    email = "testuser@novapay.com"
    password = "Test1234!"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$ACCOUNT_URL/api/accounts" -Method Post -Body $body -ContentType "application/json"
    Write-Host "User created:" ($res | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "User may already exist"
}

Write-Host "`n[4] Authenticate User" -ForegroundColor Yellow
$body = @{
    email = "testuser@novapay.com"
    password = "Test1234!"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$ACCOUNT_URL/api/accounts/auth" -Method Post -Body $body -ContentType "application/json"
    $token = $res.data.token
    Write-Host "Token obtained: $token"
} catch {
    Write-Host "Auth failed: $($_.Exception.Message)"
    $token = $null
}

if ($token) {
    Write-Host "`n[5] Get User via Gateway" -ForegroundColor Yellow
    $headers = @{ "Authorization" = "Bearer $token" }
    $res = Invoke-RestMethod -Uri "$BASE_URL/api/accounts/usr_test" -Method Get -Headers $headers
    $res | ConvertTo-Json -Depth 5
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
