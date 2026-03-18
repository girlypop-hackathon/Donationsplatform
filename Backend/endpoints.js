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

    if (hasProviderId && hasOrganizationId) {
      db.run(
        'UPDATE campaigns SET provider_id = organization_id WHERE provider_id IS NULL OR provider_id = 0',
        (backfillErr) => {
          if (backfillErr) {
            console.error('Could not backfill provider_id values:', backfillErr.message);
          }
          if (onDone) onDone();
        }
      );
      return;
    }

    if (hasProviderId) {
      if (onDone) onDone();
      return;
    }

    db.run('ALTER TABLE campaigns ADD COLUMN provider_id INTEGER', (alterErr) => {
      if (alterErr) {
        console.error('Could not add provider_id column:', alterErr.message);
        if (onDone) onDone();
        return;
      }

      if (!hasOrganizationId) {
        if (onDone) onDone();
        return;
      }

      db.run('UPDATE campaigns SET provider_id = organization_id', (updateErr) => {
        if (updateErr) {
          console.error('Could not copy organization_id to provider_id:', updateErr.message);
        } else {
          console.log('Campaign provider_id column was added and backfilled.');
        }

        if (onDone) onDone();
      });
    });
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

// GET all organizations (alias for providers)
app.get('/api/organizations', (req, res) => {
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
  const providerId = Number(req.params.id);

  if (!Number.isFinite(providerId) || providerId <= 0) {
    return res.status(400).json({ error: 'Valid provider id is required' });
  }

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
  const providerId = Number(req.params.id);

  if (!Number.isFinite(providerId) || providerId <= 0) {
    return res.status(400).json({ error: 'Valid provider id is required' });
  }

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

// POST donation for campaign
app.post('/api/campaigns/:id/donations', (req, res) => {
  const campaignId = Number(req.params.id);
  const amount = Number(req.body?.amount);
  const userName = req.body?.user_name || 'Anonymous Donor';
  const email = req.body?.email || '';
  const accountNumber = req.body?.account_number || '';
  const isSubscription = Boolean(req.body?.is_subscription);
  const generalNewsletter = Boolean(req.body?.general_newsletter);

  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return res.status(400).json({ error: 'Valid campaign id is required' });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'A valid donation amount is required' });
  }

  db.run(
    queries.createDonation,
    [
      campaignId,
      userName,
      email,
      accountNumber,
      isSubscription,
      amount,
      generalNewsletter
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const donationId = this.lastID;

      // Update campaign amount_raised
      db.run(
        'UPDATE campaigns SET amount_raised = amount_raised + ? WHERE campaign_id = ?',
        [amount, campaignId],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }

          // Fetch updated campaign to return amount_raised
          db.get(
            'SELECT amount_raised FROM campaigns WHERE campaign_id = ?',
            [campaignId],
            (getErr, row) => {
              if (getErr) {
                res.status(500).json({ error: getErr.message });
                return;
              }

              res.status(201).json({
                success: true,
                data: {
                  donation_id: donationId,
                  campaign_id: campaignId,
                  user_name: userName,
                  email,
                  account_number: accountNumber,
                  is_subscription: isSubscription,
                  amount,
                  general_newsletter: generalNewsletter,
                  amount_raised: row?.amount_raised
                }
              });
            }
          );
        }
      );
    }
  );
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
  const {
    provider_id,
    image,
    campaign_bio,
    body_text,
    goal_amount,
    amount_raised,
    milestone_1,
    milestone_2,
    milestone_3
  } = req.body;
  
  if (!provider_id || !campaign_bio || !goal_amount) {
    return res.status(400).json({ error: 'provider_id, campaign_bio, and goal_amount are required' });
  }
  
  db.run(
    queries.createCampaign,
    [
      provider_id,
      image,
      campaign_bio,
      body_text,
      goal_amount,
      amount_raised || 0,
      milestone_1,
      milestone_2,
      milestone_3
    ],
    function(err) {
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
        amount_raised: amount_raised || 0,
        milestone_1,
        milestone_2,
        milestone_3
      }
    });
  }
  );
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