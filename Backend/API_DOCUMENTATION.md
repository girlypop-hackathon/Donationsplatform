# Donation Platform API Documentation

## Overview
This API provides endpoints for accessing data from the donation platform database, including organizations, campaigns, and users.

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

### 1. GET /organizations
Returns all organizations in the system.

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
      "website_link": "https://www.dyrenesbeskyttelse.dk"
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
      "organization_id": 1,
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

### 4. GET /organizations/:id
Returns a specific organization by ID.

**Parameters:**
- `id` (URL parameter) - Organization ID

**Response:**
```json
{
  "success": true,
  "data": {
    "organization_id": 1,
    "name": "Dyrenes Beskyttelse",
    "logo": "logo1.png",
    "bio": "Dedicated to animal protection in Denmark.",
    "website_link": "https://www.dyrenesbeskyttelse.dk"
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
    "organization_id": 1,
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

### 6. GET /organizations/:id/campaigns
Returns all campaigns for a specific organization.

**Parameters:**
- `id` (URL parameter) - Organization ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaign_id": 1,
      "organization_id": 1,
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

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `200 OK` - Successful request
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "error": "Error message"
}
```

## Database Schema

### Organizations Table
- `organization_id` (INTEGER, PRIMARY KEY)
- `name` (TEXT)
- `logo` (TEXT)
- `bio` (TEXT)
- `website_link` (TEXT)

### Campaigns Table
- `campaign_id` (INTEGER, PRIMARY KEY)
- `organization_id` (INTEGER, FOREIGN KEY)
- `image` (TEXT)
- `campaign_bio` (TEXT)
- `body_text` (TEXT)
- `goal_amount` (REAL)
- `milestone_1` (INTEGER)
- `milestone_2` (INTEGER)
- `milestone_3` (INTEGER)

### Donations Table (used for users)
- `donation_id` (INTEGER, PRIMARY KEY)
- `campaign_id` (INTEGER, FOREIGN KEY)
- `user_name` (TEXT)
- `email` (TEXT)
- `account_number` (TEXT)
- `is_subscription` (BOOLEAN)
- `amount` (REAL)
- `general_newsletter` (BOOLEAN)

## Project Structure

```
Backend/
├── donations.db          # SQLite database
├── endpoints.js          # API endpoints
├── queries.js           # SQL queries
├── package.json         # Project dependencies
├── API_DOCUMENTATION.md # This documentation
└── test_endpoints.js    # Test script
```

## Testing

Run the test script to verify all endpoints are working:

```bash
node test_endpoints.js
```

Note: Make sure the server is running before running tests.

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