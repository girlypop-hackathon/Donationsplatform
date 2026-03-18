/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: API endpoints for the donation platform
*/


// endpoints.js - API endpoints for the donation platform
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const queries = require('./queries');

const app = express();
const PORT = 3000;

// Create database connection
db = new sqlite3.Database('./donations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the donations database.');
  }
});

// Middleware
app.use(express.json());

// GET all organizations
app.get('/api/organizations', (req, res) => {
  db.all(queries.getAllOrganizations, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      success: true,
      data: rows
    });
  });
});

// GET all campaigns
app.get('/api/campaigns', (req, res) => {
  db.all(queries.getAllCampaigns, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      success: true,
      data: rows
    });
  });
});

// GET all users (from donations table)
app.get('/api/users', (req, res) => {
  db.all(queries.getAllUsers, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      success: true,
      data: rows
    });
  });
});

// Additional endpoints for better API coverage

// GET campaigns by organization ID
app.get('/api/organizations/:id/campaigns', (req, res) => {
  const organizationId = req.params.id;
  db.all(queries.getCampaignsByOrganization, [organizationId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      success: true,
      data: rows
    });
  });
});

// GET donations by campaign ID
app.get('/api/campaigns/:id/donations', (req, res) => {
  const campaignId = req.params.id;
  db.all(queries.getDonationsByCampaign, [campaignId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      success: true,
      data: rows
    });
  });
});

// GET organization by ID
app.get('/api/organizations/:id', (req, res) => {
  const organizationId = req.params.id;
  db.get(queries.getOrganizationById, [organizationId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json({
      success: true,
      data: row
    });
  });
});

// GET campaign by ID
app.get('/api/campaigns/:id', (req, res) => {
  const campaignId = req.params.id;
  db.get(queries.getCampaignById, [campaignId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({
      success: true,
      data: row
    });
  });
});

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