# Donation Platform API Documentation

## Overview
This API provides endpoints for accessing data from the donation platform database, including providers (both organizations and individuals), campaigns, and users.

## Setup

### Prerequisites
- Node.js (v14 or higher)
- SQLite3

### Installation
1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   or for development with auto-restart:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

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
Returns all unique users who have made donations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_name": "John Doe",
      "email": "john@example.com"
    },
    ...
  ]
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
    "organization_id": 1,
    "name": "Dyrenes Beskyttelse",
    "logo": "logo1.png",
    "bio": "Dedicated to animal protection in Denmark.",
    "website_link": "https://www.dyrenesbeskyttelse.dk",
    "is_organization": true
  }
}
```

### 5. GET /campaigns/:id
Returns a specific campaign by ID.

**Parameters:**
- `id` (URL parameter) - Campaign ID

**Response:**
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
  }
}
```

### 6. GET /providers/:id/campaigns
Returns all campaigns for a specific provider.

**Parameters:**
- `id` (URL parameter) - Provider ID

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

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "error": "Error message"
}
```

## Database Schema

### Providers Table (formerly Organizations)
- `organization_id` (INTEGER, PRIMARY KEY)
- `name` (TEXT)
- `logo` (TEXT)
- `bio` (TEXT)
- `website_link` (TEXT)
- `is_organization` (BOOLEAN) - NEW: true for organizations, false for individuals

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