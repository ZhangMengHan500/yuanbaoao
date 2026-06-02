$body = @{email='test@test.com';password='test123456'} | ConvertTo-Json
$resp = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Body $body -ContentType 'application/json'
$token = $resp.token
Write-Host "Token: $token"

# Create test file
Set-Content -Path "$PSScriptRoot\test-upload.txt" -Value "This is a test document for RAG knowledge base. The quick brown fox jumps over the lazy dog. Artificial intelligence is transforming the world." -Encoding UTF8

# Upload file
$form = @{
    file = Get-Item "$PSScriptRoot\test-upload.txt"
}
$headers = @{Authorization="Bearer $token"}
$uploadResp = Invoke-RestMethod -Uri 'http://localhost:3000/knowledge/upload' -Method POST -InFile "$PSScriptRoot\test-upload.txt" -ContentType 'multipart/form-data' -Headers $headers
Write-Host "Upload result:"
$uploadResp | ConvertTo-Json -Depth 5
