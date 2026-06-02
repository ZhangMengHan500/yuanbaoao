$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlOTY4MjdjZi03MGQyLTQ1ZDgtYWZkZi00YTk4OWU0YzljZDIiLCJlbWFpbCI6ImRlYnVnQHRlc3QuY29tIiwiaWF0IjoxNzc5NjcxMDQ4LCJleHAiOjE3ODAyNzU4NDh9.pcKgTGlLIHWFtRAovRh0bx2AT3-SwUjfk45ifGpW8RU'

$boundary = [System.Guid]::NewGuid().ToString()
$nl = "`r`n"
$bodyStr = "--$boundary$nl" +
  'Content-Disposition: form-data; name="imageUrl"' + "$nl$nl" +
  'http://localhost:3000/uploads/tpl_070fdea5-019d-4b0b-bb80-034a1ec6f7c0.jpg' + "$nl" +
  "--$boundary$nl" +
  'Content-Disposition: form-data; name="prompt"' + "$nl$nl" +
  'a cute cat in anime style' + "$nl" +
  "--$boundary--$nl"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = "multipart/form-data; boundary=$boundary"
}

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/create/img2img' -Method Post -Body $bodyStr -Headers $headers -TimeoutSec 30 -ErrorAction Stop
    Write-Output "Status: $($response.StatusCode)"
    Write-Output $response.Content
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    Write-Output "Status: $code"
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $sr.ReadToEnd()
}
