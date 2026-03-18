/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: API endpoints for the donation platform
*/

// endpoints.js - API endpoints for the donation platform
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const queries = require('./queries');

const app = express();
const PORT = 3000;

// Create database connection
const databasePath = path.join(__dirname, 'donations.db');
db = new sqlite3.Database(databasePath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the donations database.');
  }
});

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

// GET all providers
app.get('/api/providers', (req, res) => {
  db.all(queries.getAllProviders, [], (err, rows) => {
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

// GET campaigns by provider ID
app.get('/api/providers/:id/campaigns', (req, res) => {
  const providerId = req.params.id;
  db.all(queries.getCampaignsByProvider, [providerId], (err, rows) => {
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

// GET provider by ID
app.get('/api/providers/:id', (req, res) => {
  const providerId = req.params.id;
  db.get(queries.getProviderById, [providerId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Provider not found' });
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

// POST endpoints

// POST create new provider
app.post('/api/providers', (req, res) => {
  const { name, logo, bio, website_link, is_organization } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  db.run(queries.createProvider, [name, logo, bio, website_link, is_organization || true], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({
      success: true,
      data: {
        provider_id: this.lastID,
        name,
        logo,
        bio,
        website_link,
        is_organization: is_organization || true
      }
    });
  });
});

// POST create new campaign
app.post('/api/campaigns', (req, res) => {
  const { provider_id, image, campaign_bio, body_text, goal_amount, milestone_1, milestone_2, milestone_3 } = req.body;
  
  if (!provider_id || !campaign_bio || !goal_amount) {
    return res.status(400).json({ error: 'provider_id, campaign_bio, and goal_amount are required' });
  }
  
  db.run(queries.createCampaign, [provider_id, image, campaign_bio, body_text, goal_amount, milestone_1, milestone_2, milestone_3], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({
      success: true,
      data: {
        campaign_id: this.lastID,
        provider_id,
        image,
        campaign_bio,
        body_text,
        goal_amount,
        milestone_1,
        milestone_2,
        milestone_3
      }
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