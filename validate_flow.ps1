$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:4000"

try {
    # 1. Get Admin Token
    Write-Host "1. Getting Admin Token..."
    $adminRes = Invoke-RestMethod -Uri "$baseUrl/auth/dev/admin-token" -Method Post -Body (@{ email = "admin@test.com" } | ConvertTo-Json) -ContentType "application/json"
    $token = $adminRes.accessToken
    Write-Host "   Admin Token obtained."

    $headers = @{ Authorization = "Bearer $token" }

    # 2. Create Event
    Write-Host "2. Creating Event..."
    $eventBody = @{
        title = "Test Event"
        description = "Test Description"
        location = "Test Location"
        startDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        endDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
        capacity = 100
        imageUrl = "http://example.com/image.jpg"
    } | ConvertTo-Json
    $eventRes = Invoke-RestMethod -Uri "$baseUrl/events" -Method Post -Headers $headers -Body $eventBody -ContentType "application/json"
    $eventId = $eventRes.id
    Write-Host "   Event created. ID: $eventId"

    # 3. Create Device (Bound to Event)
    Write-Host "3. Creating Device..."
    $deviceBody = @{
        name = "Test Device Bound"
        type = "android"
        enabled = $true
        eventId = $eventId
    } | ConvertTo-Json
    $deviceRes = Invoke-RestMethod -Uri "$baseUrl/devices" -Method Post -Headers $headers -Body $deviceBody -ContentType "application/json"
    $deviceApiKey = $deviceRes.apiKey
    Write-Host "   Device created. API Key: $deviceApiKey"

    # 3.5 Publish Event
    Write-Host "3.5 Publishing Event..."
    Invoke-RestMethod -Uri "$baseUrl/events/$eventId/publish" -Method Post -Headers $headers
    Write-Host "   Event published."

    # 4. Create Ticket Type
    Write-Host "4. Creating Ticket Type..."
    $ttBody = @{
        name = "VIP"
        price = 100
        quantity = 50
    } | ConvertTo-Json
    $ttRes = Invoke-RestMethod -Uri "$baseUrl/events/$eventId/ticket-types" -Method Post -Headers $headers -Body $ttBody -ContentType "application/json"
    $ttId = $ttRes.id
    Write-Host "   Ticket Type created. ID: $ttId"

    # 5. Create Order
    Write-Host "5. Creating Order..."
    $orderBody = @{
        eventId = $eventId
        ticketTypeId = $ttId
    } | ConvertTo-Json
    $orderRes = Invoke-RestMethod -Uri "$baseUrl/orders" -Method Post -Headers $headers -Body $orderBody -ContentType "application/json"
    $orderId = $orderRes.order.id
    $ticketCode = $orderRes.ticket.code
    Write-Host "   Order created. ID: $orderId. Ticket Code: $ticketCode"

    # 6. Pay Order
    Write-Host "6. Paying Order..."
    $payBody = @{
        method = "PIX"
    } | ConvertTo-Json
    $payRes = Invoke-RestMethod -Uri "$baseUrl/orders/$orderId/pay" -Method Post -Headers $headers -Body $payBody -ContentType "application/json"
    Write-Host "   Order paid."

    # 7. Validate Ticket (Check-in)
    Write-Host "7. Validating Ticket..."
    $checkinBody = @{
        code = $ticketCode
    } | ConvertTo-Json
    $checkinHeaders = @{
        "x-api-key" = $deviceApiKey
        "Content-Type" = "application/json"
    }

    $checkinRes = Invoke-RestMethod -Uri "$baseUrl/checkin/validate" -Method Post -Headers $checkinHeaders -Body $checkinBody
    Write-Host "   Check-in Result: $($checkinRes.success) - $($checkinRes.message)"
    
    if ($checkinRes.success -eq $true) {
        Write-Host "SUCCESS: Flow validated."
    } else {
        Write-Host "FAILURE: Check-in failed."
        exit 1
    }

} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Response Body: $respBody"
    }
    exit 1
}
