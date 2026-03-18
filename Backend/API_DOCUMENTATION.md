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

### 1. GET /providers
Returns all providers in the system (both organizations and individuals).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "organization_id": 1,
      "name": "Dyrenes Beskyttelse",
      "logo": "logo1.png",
      "bio": "Dedicated to animal protection in Denmark.",
      "website_link": "https://www.dyrenesbeskyttelse.dk",
      "is_organization": true
    },
    {
      "organization_id": 2,
      "name": "John Doe",
      "logo": null,
      "bio": "Private person supporting animal causes.",
      "website_link": null,
      "is_organization": false
    },
    ...
  ]
}
```

### 2. GET /campaigns
Returns all campaigns in the system.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaign_id": 1,
      "provider_id": 1,
      "image": "campaign1.jpg",
      "campaign_bio": "Help save abandoned pets.",
      "body_text": "Detailed description...",
      "goal_amount": 5000,
      "milestone_1": 1000,
      "milestone_2": 2500,
      "milestone_3": 4000
    },
    ...
  ]
}
```

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

### 4. GET /providers/:id
Returns a specific provider by ID.

**Parameters:**
- `id` (URL parameter) - Provider ID

**Response:**
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
    ],
    "is_organization": true
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
    "campaign_id": 1,
    "provider_id": 1,
    "image": "campaign1.jpg",
    "campaign_bio": "Help save abandoned pets.",
    "body_text": "Detailed description...",
    "goal_amount": 5000,
    "milestone_1": 1000,
    "milestone_2": 2500,
    "milestone_3": 4000
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

### 6. GET /providers/:id/campaigns
Returns all campaigns for a specific provider.

**Parameters:**
- `id` (URL parameter) - Provider ID

**Response:**
```json
{
  "newsletterTitle": "April Campaign Updates",
  "newsletterBody": "Thank you for supporting our mission this month.",
  "campaignId": 1
  "success": true,
  "data": [
    {
      "campaign_id": 1,
      "provider_id": 1,
      "image": "campaign1.jpg",
      "campaign_bio": "Help save abandoned pets.",
      "body_text": "Detailed description...",
      "goal_amount": 5000,
      "milestone_1": 1000,
      "milestone_2": 2500,
      "milestone_3": 4000
    },
    ...
  ]
}
```

### 7. GET /campaigns/:id/donations
Returns all donations for a specific campaign.

**Parameters:**
- `id` (URL parameter) - Campaign ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "donation_id": 1,
      "campaign_id": 1,
      "user_name": "John Doe",
      "email": "john@example.com",
      "account_number": "123456789",
      "is_subscription": true,
      "amount": 50,
      "general_newsletter": true
    },
    ...
  ]
}
```

## POST Endpoints

### 8. POST /providers
Creates a new provider (organization or individual).

**Request Body:**
```json
{
  "name": "Provider Name",
  "logo": "logo.png",
  "bio": "Description of the provider",
  "website_link": "https://example.com",
  "is_organization": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider_id": 5,
    "name": "Provider Name",
    "logo": "logo.png",
    "bio": "Description of the provider",
    "website_link": "https://example.com",
    "is_organization": true
  }
}
```

### 9. POST /campaigns
Creates a new campaign for a provider.

**Request Body:**
```json
{
  "provider_id": 1,
  "image": "campaign.jpg",
  "campaign_bio": "Short description",
  "body_text": "Detailed description",
  "goal_amount": 10000,
  "milestone_1": 2000,
  "milestone_2": 5000,
  "milestone_3": 8000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign_id": 5,
    "provider_id": 1,
    "image": "campaign.jpg",
    "campaign_bio": "Short description",
    "body_text": "Detailed description",
    "goal_amount": 10000,
    "milestone_1": 2000,
    "milestone_2": 5000,
    "milestone_3": 8000
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

### Providers Table (formerly Organizations)
- `organization_id` (INTEGER, PRIMARY KEY)
- `name` (TEXT)
- `logo` (TEXT)
- `bio` (TEXT)
- `website_link` (TEXT)

### Campaigns Table
- `campaign_id` (INTEGER, PRIMARY KEY)
- `provider_id` (INTEGER, FOREIGN KEY) - UPDATED: references providers.organization_id
- `image` (TEXT)
- `campaign_bio` (TEXT)
- `body_text` (TEXT)
- `goal_amount` (REAL)
- `milestone_1` (INTEGER)
- `milestone_2` (INTEGER)
- `milestone_3` (INTEGER)

### Donations Table
- `donation_id` (INTEGER, PRIMARY KEY)
- `campaign_id` (INTEGER, FOREIGN KEY)
- `user_name` (TEXT)
- `email` (TEXT)
- `account_number` (TEXT)
- `is_subscription` (BOOLEAN)
- `amount` (REAL)
- `general_newsletter` (BOOLEAN)

## Key Changes from Previous Version

### 1. Organizations → Providers
- Table renamed from `organizations` to `providers`
- All endpoints updated from `/organizations` to `/providers`
- Foreign key in campaigns table changed from `organization_id` to `provider_id`

### 2. New Field: is_organization
- Added `is_organization` BOOLEAN field to providers table
- `true` = Organization (default)
- `false` = Private individual
- Allows both organizations and private persons to create campaigns

### 3. New POST Endpoints
- `POST /api/providers` - Create new provider
- `POST /api/campaigns` - Create new campaign

### Campaign events

- `event_id` (INTEGER, PRIMARY KEY)
- `campaign_id` (INTEGER, FOREIGN KEY)
- `event_type` (TEXT, unique per campaign)
- `created_at` (TEXT)
## Project Structure

```
Backend/
├── donations.db          # SQLite database
├── endpoints.js          # API endpoints
├── queries.js           # SQL queries
├── package.json         # Project dependencies
├── API_DOCUMENTATION.md # This documentation
└── ...
```

## Testing the API

Run this smoke test script after starting the backend server:
### Test POST endpoints with curl:

```bash
# Create a new provider (organization)
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{"name": "New Organization", "is_organization": true}'

# Create a new provider (individual)
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Smith", "is_organization": false}'

# Create a new campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"provider_id": 1, "campaign_bio": "New Campaign", "goal_amount": 5000}'
```

## Development

For development, use nodemon for automatic server restart:

```bash
npm run dev
```

## Deployment

The API is ready for production use. For deployment:

1. Set up a production database
2. Configure environment variables for database connection
3. Use a process manager like PM2
4. Set up proper logging and monitoring
node Testing/test_endpoints.js
```
