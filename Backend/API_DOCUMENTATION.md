# Donation Platform API Documentation

## Overview

This API exposes donation platform data and email automation flows for:

- Tiered thank-you emails based on donation amount.
- Campaign milestone and close follow-up emails.
- Opt-in newsletters for donors.

## Setup

### Prerequisites

- Node.js (v14 or higher)
- SQLite3

### Installation

1. Navigate to the backend folder.

```bash
cd Backend
```

1. Install dependencies.

```bash
npm install
```

1. Start the server.

```bash
npm start
```

Or, for development with auto-restart:

```bash
npm run dev
```

The server runs at `http://localhost:3000`.

### Optional SMTP configuration

If SMTP is configured, emails are sent through SMTP.
If SMTP is not configured, email payloads are logged to the console.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE` (`true` or `false`)

## Base URL

```text
http://localhost:3000/api
```

## Endpoints

### 1. GET /organizations

Returns all organizations.

### 2. GET /campaigns

Returns all campaigns.

### 3. GET /users

Returns unique donors (`user_name`, `email`).

### 4. GET /organizations/:id

Returns one organization by ID.

### 5. GET /campaigns/:id

Returns one campaign by ID.

### 6. GET /organizations/:id/campaigns

Returns campaigns for one organization.

### 7. GET /campaigns/:id/donations

Returns donations for one campaign.

### 8. POST /donations

Creates a donation and triggers the donation email flow.

Tier rules:

- Under `200 DKK`: simple thank-you email.
- `200-1,000 DKK`: personal thank-you + campaign update message.
- Over `1,000 DKK`: personal thank-you + dedicated follow-up email.

If a campaign milestone is reached by the new donation, donors opted in to campaign updates are notified.

Request body:

```json
{
  "campaignId": 1,
  "userName": "Jane Doe",
  "email": "jane@example.com",
  "accountNumber": "123456789",
  "campaignUpdatesOptIn": true,
  "amount": 1200,
  "newsletterOptIn": true
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "donationId": 10,
    "donationTier": "over_1000",
    "totalRaisedAmount": 6200,
    "triggeredMilestones": [
      {
        "eventType": "milestone_2_reached",
        "milestoneAmount": 2500,
        "notifiedSubscribers": 5
      }
    ]
  }
}
```

### 9. POST /campaigns/:id/close

Sends campaign close follow-up emails to donors opted in to campaign updates.

Success response:

```json
{
  "success": true,
  "data": {
    "campaignId": 1,
    "notifiedSubscribers": 7,
    "totalRaisedAmount": 9400
  }
}
```

### 10. POST /newsletters/send

Sends a newsletter to donors opted in to newsletters.
You can optionally filter by campaign by including `campaignId`.

Request body:

```json
{
  "newsletterTitle": "April Campaign Updates",
  "newsletterBody": "Thank you for supporting our mission this month.",
  "campaignId": 1
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "recipientsCount": 11,
    "campaignId": 1
  }
}
```

## Error handling

Common statuses:

- `200 OK` for successful reads.
- `201 Created` for successful donation creation.
- `400 Bad Request` for invalid input.
- `404 Not Found` when resource does not exist.
- `500 Internal Server Error` for server/database failures.

Error format:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Database schema

### Organizations

- `organization_id` (INTEGER, PRIMARY KEY)
- `name` (TEXT)
- `logo` (TEXT)
- `bio` (TEXT)
- `website_link` (TEXT)

### Campaigns

- `campaign_id` (INTEGER, PRIMARY KEY)
- `organization_id` (INTEGER, FOREIGN KEY)
- `image` (TEXT)
- `campaign_bio` (TEXT)
- `body_text` (TEXT)
- `goal_amount` (REAL)
- `milestone_1` (INTEGER)
- `milestone_2` (INTEGER)
- `milestone_3` (INTEGER)

### Donations

- `donation_id` (INTEGER, PRIMARY KEY)
- `campaign_id` (INTEGER, FOREIGN KEY)
- `user_name` (TEXT)
- `email` (TEXT)
- `account_number` (TEXT)
- `is_subscription` (BOOLEAN)
- `amount` (REAL)
- `general_newsletter` (BOOLEAN)

### Campaign events

- `event_id` (INTEGER, PRIMARY KEY)
- `campaign_id` (INTEGER, FOREIGN KEY)
- `event_type` (TEXT, unique per campaign)
- `created_at` (TEXT)

## Testing

Run this smoke test script after starting the backend server:

```bash
node Testing/test_endpoints.js
```
