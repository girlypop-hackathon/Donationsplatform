/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: API endpoints for the donation platform

Note: this file needs cleanup regarding to many tests for provider_id - check if we already have it = no need for all this lenght
*/

// endpoints.js - Main API entry point for the donation platform
// Orchestrates modular endpoint files and handles database setup
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const queries = require('./queries');
const emailService = require('./emailService');

// Import modular endpoint files
const providersEndpoints = require('./API Endpoints/providers');
const campaignsEndpoints = require('./API Endpoints/campaigns');
const donationsEndpoints = require('./API Endpoints/donations');
const campaignEventsEndpoints = require('./API Endpoints/campaignEvents');
const newslettersEndpoints = require('./API Endpoints/newsletters');

const app = express();
const PORT = 3000;

// Create database connection
const db = new sqlite3.Database('./donations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the donations database.');
    ensureProviderIdColumn(() => {
      ensureAmountRaisedColumn();
    });
  }
});

function ensureProviderIdColumn(onDone) {
  db.all('PRAGMA table_info(campaigns)', [], (err, columns) => {
    if (err) {
      console.error('Could not inspect campaigns table for provider_id:', err.message);
      if (onDone) onDone();
      return;
    }

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    const hasProviderId = columns.some((column) => column.name === 'provider_id');
    const hasOrganizationId = columns.some((column) => column.name === 'organization_id');

    // If we have provider_id, we're good to go
    if (hasProviderId) {
      console.log('provider_id column already exists.');
      if (onDone) onDone();
      return;
    }

    // If we don't have provider_id but have organization_id, migrate
    if (!hasProviderId && hasOrganizationId) {
      db.run('ALTER TABLE campaigns ADD COLUMN provider_id INTEGER', (alterErr) => {
        if (alterErr) {
          console.error('Could not add provider_id column:', alterErr.message);
          if (onDone) onDone();
          return;
        }

        db.run('UPDATE campaigns SET provider_id = organization_id', (updateErr) => {
          if (updateErr) {
            console.error('Could not copy organization_id to provider_id:', updateErr.message);
          } else {
            console.log('Campaign provider_id column was added and backfilled from organization_id.');
          }
          if (onDone) onDone();
        });
      });
      return;
    }

    // If we have neither, just add provider_id column
    if (!hasProviderId && !hasOrganizationId) {
      db.run('ALTER TABLE campaigns ADD COLUMN provider_id INTEGER', (alterErr) => {
        if (alterErr) {
          console.error('Could not add provider_id column:', alterErr.message);
        } else {
          console.log('Added provider_id column to campaigns table.');
        }
        if (onDone) onDone();
      });
      return;
    }
  });
}

function ensureAmountRaisedColumn() {
  db.all('PRAGMA table_info(campaigns)', [], (err, columns) => {
    if (err) {
      console.error('Could not inspect campaigns table:', err.message);
      return;
    }

    const hasAmountRaised = columns.some((column) => column.name === 'amount_raised');

    if (columns.length === 0) {
      return;
    }

    if (hasAmountRaised) {
      return;
    }

    db.run('ALTER TABLE campaigns ADD COLUMN amount_raised REAL DEFAULT 0', (alterErr) => {
      if (alterErr) {
        console.error('Could not add amount_raised column:', alterErr.message);
        return;
      }

      db.run(
        `UPDATE campaigns
         SET amount_raised = COALESCE(
           (SELECT SUM(amount) FROM donations WHERE donations.campaign_id = campaigns.campaign_id),
           0
         )`,
        (updateErr) => {
          if (updateErr) {
            console.error('Could not backfill amount_raised values:', updateErr.message);
            return;
          }

          console.log('Campaign amount_raised column was added and backfilled.');
        }
      );
    });
  });
}

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Basic CORS support so local frontend can call this API during development.
app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.sendStatus(200);
    return;
  }

  next();
});



// Setup modular routers with database connection
providersEndpoints.setDatabase(db);
campaignsEndpoints.setDatabase(db);
donationsEndpoints.setDatabase(db);
campaignEventsEndpoints.setDatabase(db);
newslettersEndpoints.setDatabase(db);

// Use the modular routers
app.use(providersEndpoints.router);
app.use(campaignsEndpoints.router);
app.use(donationsEndpoints.router);
app.use(campaignEventsEndpoints.router);
app.use(newslettersEndpoints.router);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit();
  });
});

module.exports = app;