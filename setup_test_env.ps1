$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:4000"

try {
    # 1. Get Admin Token
    Write-Host "1. Getting Admin Token..."
    $adminRes = Invoke-RestMethod -Uri "$baseUrl/auth/dev/admin-token" -Method Post -Body (@{ email = "admin@test.com" } | ConvertTo-Json) -ContentType "application/json"
    $token = $adminRes.accessToken
    $headers = @{ Authorization = "Bearer $token" }

    # 2. Create Event
    Write-Host "2. Creating Event for Frontend Test..."
    $eventBody = @{
        title = "Frontend Test Event"
        description = "Event specifically for testing the Portaria App"
        location = "Test Location"
        startDate = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(6).ToString("yyyy-MM-dd")
        capacity = 200
        imageUrl = "http://example.com/image.jpg"
    } | ConvertTo-Json
    $eventRes = Invoke-RestMethod -Uri "$baseUrl/events" -Method Post -Headers $headers -Body $eventBody -ContentType "application/json"
    $eventId = $eventRes.id
    Write-Host "   Event created. ID: $eventId"

    # 3. Create Device (Bound to Event)
    Write-Host "3. Creating Device..."
    $deviceBody = @{
        name = "Portaria Device 01"
        type = "android"
        enabled = $true
        eventId = $eventId
    } | ConvertTo-Json
    $deviceRes = Invoke-RestMethod -Uri "$baseUrl/devices" -Method Post -Headers $headers -Body $deviceBody -ContentType "application/json"
    $deviceApiKey = $deviceRes.apiKey
    Write-Host "   Device created."

    # 4. Publish Event
    Write-Host "4. Publishing Event..."
    Invoke-RestMethod -Uri "$baseUrl/events/$eventId/publish" -Method Post -Headers $headers

    # 5. Create Ticket Type
    Write-Host "5. Creating Ticket Type..."
    $ttBody = @{
        name = "General Admission"
        price = 50
        quantity = 100
    } | ConvertTo-Json
    $ttRes = Invoke-RestMethod -Uri "$baseUrl/events/$eventId/ticket-types" -Method Post -Headers $headers -Body $ttBody -ContentType "application/json"
    $ttId = $ttRes.id

    # 6. Create Order & Ticket
    Write-Host "6. Creating Valid Ticket..."
    $orderBody = @{
        eventId = $eventId
        ticketTypeId = $ttId
    } | ConvertTo-Json
    $orderRes = Invoke-RestMethod -Uri "$baseUrl/orders" -Method Post -Headers $headers -Body $orderBody -ContentType "application/json"
    $orderId = $orderRes.order.id
    $ticketCode = $orderRes.ticket.code
    
    # 7. Pay Order
    $payBody = @{ method = "PIX" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/orders/$orderId/pay" -Method Post -Headers $headers -Body $payBody -ContentType "application/json"
    
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "       TEST DATA GENERATED"
    Write-Host "=========================================="
    Write-Host "Device API Key: $deviceApiKey"
    Write-Host "Valid Ticket Code: $ticketCode"
    Write-Host "=========================================="
    Write-Host ""

} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
