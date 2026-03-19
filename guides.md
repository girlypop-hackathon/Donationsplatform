# Email Service Test Guide

This guide explains how to test the email functionality in two modes:

1. Fallback mode (no SMTP login, logs emails in terminal)
2. Real inbox mode (SMTP enabled, sends real emails)

## Prerequisites

- Node.js installed
- Dependencies installed in both project root and Backend folder
- Backend API available in `Backend/`

## Mode 1: Fallback Test (No Password Required)

Use this mode to validate logic safely without sending real emails.

### 1. Start with clean environment

Open PowerShell:

```powershell
Set-Location "c:\Kode - ITA\4. Semester\Donations_opg\Donationsplatform\Backend"

$connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($connection) { Stop-Process -Id $connection.OwningProcess -Force }

Remove-Item Env:SMTP_HOST -ErrorAction SilentlyContinue
Remove-Item Env:SMTP_PORT -ErrorAction SilentlyContinue
Remove-Item Env:SMTP_USER -ErrorAction SilentlyContinue
Remove-Item Env:SMTP_PASS -ErrorAction SilentlyContinue
Remove-Item Env:SMTP_FROM -ErrorAction SilentlyContinue
Remove-Item Env:SMTP_SECURE -ErrorAction SilentlyContinue

npm run setup
npm start
```

### 2. Opt in a test email via donation

Open a second PowerShell terminal:

```powershell
Set-Location "c:\Kode - ITA\4. Semester\Donations_opg\Donationsplatform\Backend"

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/donations" -ContentType "application/json" -Body (@{
  campaignId = 1
  userName = "Newsletter Test"
  email = "your-test-email@example.com"
  accountNumber = "12345678"
  campaignUpdatesOptIn = $true
  amount = 250
  newsletterOptIn = $true
} | ConvertTo-Json) | ConvertTo-Json -Depth 8
```

### 3. Send newsletter to opted-in users

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/newsletters/send" -ContentType "application/json" -Body (@{
  newsletterTitle = "Newsletter test"
  newsletterBody = "Testing newsletter flow without SMTP."
} | ConvertTo-Json) | ConvertTo-Json -Depth 8
```

### 4. Verify output

In the backend terminal, confirm `EMAIL_FALLBACK_LOG` entries appear with recipients and subjects.

## Mode 2: Real Inbox Test (SMTP Required)

Use this mode to deliver real emails.

### 1. Create sender credentials

For Gmail:

1. Enable 2-Step Verification
2. Create App Password
3. Use that 16-character App Password as `SMTP_PASS`

### 2. Set SMTP environment variables

```powershell
Set-Location "c:\Kode - ITA\4. Semester\Donations_opg\Donationsplatform\Backend"

$env:SMTP_HOST = "smtp.gmail.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "your-sender@gmail.com"
$env:SMTP_PASS = "YOUR_16_CHAR_APP_PASSWORD"
$env:SMTP_FROM = "your-sender@gmail.com"
$env:SMTP_SECURE = "false"
```

For Outlook use:

- `SMTP_HOST = smtp.office365.com`
- `SMTP_PORT = 587`
- `SMTP_SECURE = false`

### 3. Restart backend in same terminal

```powershell
$connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($connection) { Stop-Process -Id $connection.OwningProcess -Force }

npm start
```

### 4. Trigger donation and newsletter endpoints

Use the same endpoint commands from Mode 1.

### 5. Verify delivery

- Check inbox and spam folder for incoming messages
- If you get `535 BadCredentials`, verify SMTP username/password/app password

## Test Cases To Run

- Donation under 200 DKK: simple thank-you email
- Donation 200-1000 DKK: thank-you plus campaign update
- Donation over 1000 DKK: thank-you plus dedicated follow-up
- Newsletter send: only newsletter-opted-in recipients
- Campaign close endpoint: sends close follow-up to campaign subscribers

## Useful Troubleshooting

- `Invoke-RestMethod` fails immediately:
  - Ensure backend is running on port 3000
- `535 BadCredentials`:
  - SMTP sender auth is wrong
  - Use App Password for Gmail
- Requests succeed but no inbox email:
  - Check spam folder
  - Confirm SMTP vars are set in the same terminal where backend was started
- You want no-password testing:
  - Clear all `SMTP_*` vars and use fallback mode
