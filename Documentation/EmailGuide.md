# Email Service Test Guide (Real Inbox Only)

This guide explains how to test real inbox delivery for donation emails and newsletters.

## Prerequisites

- Node.js installed
- Project dependencies installed
- A real sender email account with SMTP access

## 1. Prepare sender credentials

For Gmail:

1. Enable 2-Step Verification on the sender account
2. Create an App Password
3. Use the App Password as SMTP_PASS

Login details:

- Email keatest78@gmail.com
- Kode: nUSZNwn4bryw9u
- App password: jwdq agru gayw zvkg

## 2. Set SMTP environment variables

Open PowerShell:

```powershell
Set-Location "c:\Kode - ITA\4. Semester\Donations_opg\Donationsplatform\Backend"

$env:SMTP_HOST = "smtp.gmail.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "keatest78@gmail.com"
$env:SMTP_PASS = "jwdq agru gayw zvkg"
$env:SMTP_FROM = "keatest78@gmail.com"
$env:SMTP_SECURE = "false"
```

## 3. Start backend with SMTP enabled

```powershell
$connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($connection) { Stop-Process -Id $connection.OwningProcess -Force }

npm run setup
npm start
```

Keep this terminal open while testing.

## 4. Opt in a recipient through donation

Open a second PowerShell terminal:

```powershell
Set-Location "c:\Kode - ITA\4. Semester\Donations_opg\Donationsplatform\Backend"

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/donations" -ContentType "application/json" -Body (@{
  campaignId = 1
  userName = "Newsletter Test"
  email = "your-recipient@example.com"
  accountNumber = "12345678"
  campaignUpdatesOptIn = $true
  amount = 250
  newsletterOptIn = $true
} | ConvertTo-Json) | ConvertTo-Json -Depth 8
```

## 5. Send newsletter to opted-in users

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/newsletters/send" -ContentType "application/json" -Body (@{
  newsletterTitle = "Real inbox newsletter test"
  newsletterBody = "This is a real inbox delivery test."
} | ConvertTo-Json) | ConvertTo-Json -Depth 8
```

## 6. Verify inbox delivery

- Check the recipient inbox and spam folder
- Confirm sender is your SMTP_FROM address
- Confirm API response has success true

## 7. Recommended test cases

- Donation under 200 DKK: simple thank-you email
- Donation 200-1000 DKK: thank-you plus campaign update
- Donation over 1000 DKK: thank-you plus dedicated follow-up
- Newsletter send: only newsletter-opted-in recipients
- Campaign close endpoint: close follow-up emails to campaign subscribers

## Troubleshooting

- 535 BadCredentials:
  - SMTP username/password or app password is incorrect
  - Recreate app password and restart backend in the same terminal
- Request fails immediately:
  - Backend is not running on port 3000
- Success response but no email seen:
  - Check spam folder
  - Verify SMTP_FROM is a valid sender on your provider
