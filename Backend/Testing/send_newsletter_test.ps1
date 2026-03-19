param(
  [Parameter(Mandatory = $false)]
  [string]$NewsletterTitle = "Real inbox newsletter test",

  [Parameter(Mandatory = $false)]
  [string]$NewsletterBody = "This is a real inbox delivery test."
)

$ErrorActionPreference = 'Stop'

# Sets SMTP environment variables so the backend sends real emails through Gmail SMTP.
function Set-SmtpEnvironment {
  $env:SMTP_HOST = 'smtp.gmail.com'
  $env:SMTP_PORT = '587'
  $env:SMTP_USER = 'keatest78@gmail.com'
  $env:SMTP_PASS = 'jwdq agru gayw zvkg'
  $env:SMTP_FROM = 'keatest78@gmail.com'
  $env:SMTP_SECURE = 'false'
}

# Waits until the backend API responds on localhost:3000 or times out.
function Wait-ApiReady {
  param(
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/providers' | Out-Null
      return $true
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  return $false
}

# Starts the backend API if it is not already running on port 3000.
function Ensure-BackendRunning {
  $existingListener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if ($existingListener) {
    Write-Host 'Backend is already running on port 3000. Restarting to apply SMTP variables...' -ForegroundColor Yellow

    $backendProcessId = $existingListener[0].OwningProcess
    Stop-Process -Id $backendProcessId -Force
    Start-Sleep -Seconds 1
  }

  Write-Host 'Starting backend in a new PowerShell window...' -ForegroundColor Yellow
  $backendStartCommand = "Set-Location '$PSScriptRoot\..'; npm start"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendStartCommand | Out-Null

  if (-not (Wait-ApiReady -TimeoutSeconds 25)) {
    throw 'Backend did not start on http://localhost:3000 within 25 seconds.'
  }

  Write-Host 'Backend started successfully.' -ForegroundColor Green
}

# Sends one newsletter email request to all newsletter-opted-in users.
function Send-NewsletterToOptedInUsers {
  param(
    [string]$Title,
    [string]$Body
  )

  $newsletterPayload = @{
    newsletterTitle = $Title
    newsletterBody = $Body
  } | ConvertTo-Json

  return Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/newsletters/send' -ContentType 'application/json' -Body $newsletterPayload
}

Set-Location "$PSScriptRoot\.."
Set-SmtpEnvironment
Ensure-BackendRunning

if (-not (Wait-ApiReady -TimeoutSeconds 10)) {
  throw 'Backend is not reachable at http://localhost:3000.'
}

$result = Send-NewsletterToOptedInUsers -Title $NewsletterTitle -Body $NewsletterBody

if (-not $result.success) {
  throw 'Newsletter request failed. Check backend logs for details.'
}

if ([int]$result.data.recipientsCount -le 0) {
  throw 'No opted-in newsletter recipients were found. Add newsletter-opted-in donations first.'
}

Write-Host 'Newsletter request completed.' -ForegroundColor Green
Write-Host ('Success: ' + $result.success)
Write-Host ('Recipients: ' + $result.data.recipientsCount)
Write-Host ('Campaign filter: ' + $result.data.campaignId)
