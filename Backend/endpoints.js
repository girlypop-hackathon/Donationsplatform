/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: API endpoints for the donation platform
*/

// endpoints.js - API endpoints for the donation platform
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const queries = require('./queries');
const emailService = require('./emailService');

const app = express();
const PORT = 3000;

// Create database connection
const db = new sqlite3.Database('./donations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the donations database.');
  }
});

// Middleware
app.use(express.json());

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

/**
 * Executes a SQL run query and resolves with metadata like last inserted ID.
 */
function runQuery(queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.run(queryText, queryParams, function onQueryRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        changes: this.changes,
        lastId: this.lastID
      });
    });
  });
}

/**
 * Executes a SQL query that returns one row.
 */
function getSingleRow(queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.get(queryText, queryParams, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

/**
 * Executes a SQL query that returns multiple rows.
 */
function getManyRows(queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.all(queryText, queryParams, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

/**
 * Ensures campaign event table exists for milestone and close email deduplication.
 */
async function ensureCampaignEventTable() {
  await runQuery(`CREATE TABLE IF NOT EXISTS campaign_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, event_type),
    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
  )`);
}

/**
 * Validates donor payload used when creating a donation.
 */
function validateDonationInput(donationInput) {
  if (!Number.isFinite(donationInput.campaignId) || donationInput.campaignId <= 0) {
    return 'campaignId must be a positive number';
  }

  if (!donationInput.userName || donationInput.userName.trim().length < 2) {
    return 'userName is required and must be at least 2 characters';
  }

  if (!donationInput.email || !donationInput.email.includes('@')) {
    return 'email is required and must be a valid email address';
  }

  if (!Number.isFinite(donationInput.amount) || donationInput.amount <= 0) {
    return 'amount must be a positive number';
  }

  return null;
}

/**
 * Returns milestone event descriptors that are reached for the current total.
 */
function getReachedMilestoneEvents(campaignRow, totalRaisedAmount) {
  const reachedMilestoneEvents = [];

  if (Number(campaignRow.milestone_1) > 0 && totalRaisedAmount >= Number(campaignRow.milestone_1)) {
    reachedMilestoneEvents.push({
      eventType: 'milestone_1_reached',
      milestoneAmount: Number(campaignRow.milestone_1)
    });
  }

  if (Number(campaignRow.milestone_2) > 0 && totalRaisedAmount >= Number(campaignRow.milestone_2)) {
    reachedMilestoneEvents.push({
      eventType: 'milestone_2_reached',
      milestoneAmount: Number(campaignRow.milestone_2)
    });
  }

  if (Number(campaignRow.milestone_3) > 0 && totalRaisedAmount >= Number(campaignRow.milestone_3)) {
    reachedMilestoneEvents.push({
      eventType: 'milestone_3_reached',
      milestoneAmount: Number(campaignRow.milestone_3)
    });
  }

  return reachedMilestoneEvents;
}

/**
 * Sends milestone follow-up emails to donors subscribed to campaign updates.
 */
async function sendMilestoneEmailsToSubscribers({ campaignId, campaignBio, milestoneAmount, totalRaisedAmount }) {
  const campaignSubscribers = await getManyRows(queries.getCampaignUpdateSubscribers, [campaignId]);

  const sendResults = await Promise.all(campaignSubscribers.map(async (subscriber) => {
    const emailContent = emailService.buildMilestoneFollowUpEmail({
      donorName: subscriber.user_name || 'donor',
      campaignBio,
      milestoneAmount,
      totalRaisedAmount
    });

    return emailService.sendEmailMessage({
      recipientEmail: subscriber.email,
      subjectLine: emailContent.subjectLine,
      messageText: emailContent.messageText
    });
  }));

  return {
    notifiedSubscribers: campaignSubscribers.length,
    smtpSentCount: sendResults.filter((result) => result.sent).length
  };
}

/**
 * Checks reached milestones and sends each milestone follow-up only once.
 */
async function processReachedMilestones(campaignRow, totalRaisedAmount) {
  const reachedMilestones = getReachedMilestoneEvents(campaignRow, totalRaisedAmount);
  const triggeredMilestones = [];

  for (const reachedMilestone of reachedMilestones) {
    const existingCampaignEvent = await getSingleRow(queries.getCampaignEventByType, [
      campaignRow.campaign_id,
      reachedMilestone.eventType
    ]);

    if (existingCampaignEvent) {
      continue;
    }

    await runQuery(queries.insertCampaignEvent, [campaignRow.campaign_id, reachedMilestone.eventType]);

    const milestoneSendStats = await sendMilestoneEmailsToSubscribers({
      campaignId: campaignRow.campaign_id,
      campaignBio: campaignRow.campaign_bio,
      milestoneAmount: reachedMilestone.milestoneAmount,
      totalRaisedAmount
    });

    triggeredMilestones.push({
      eventType: reachedMilestone.eventType,
      milestoneAmount: reachedMilestone.milestoneAmount,
      notifiedSubscribers: milestoneSendStats.notifiedSubscribers
    });
  }

  return triggeredMilestones;
}

ensureCampaignEventTable().catch((error) => {
  console.error('Failed to create campaign event table:', error.message);
});

// GET all providers
app.get('/api/providers', async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllProviders);
    response.json({
      success: true,
      data: rows
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET all campaigns
app.get('/api/campaigns', async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllCampaigns);
    response.json({
      success: true,
      data: rows
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET all users (from donations table)
app.get('/api/users', async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllUsers);
    response.json({
      success: true,
      data: rows
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// Additional endpoints for better API coverage

// GET campaigns by provider ID
app.get('/api/providers/:id/campaigns', async (request, response) => {
  try {
    const providerId = request.params.id;
    const rows = await getManyRows(queries.getCampaignsByProvider, [providerId]);
    response.json({
      success: true,
      data: rows
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET donations by campaign ID
app.get('/api/campaigns/:id/donations', async (request, response) => {
  try {
    const campaignId = request.params.id;
    const rows = await getManyRows(queries.getDonationsByCampaign, [campaignId]);
    response.json({
      success: true,
      data: rows
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET provider by ID
app.get('/api/providers/:id', async (request, response) => {
  try {
    const providerId = request.params.id;
    const row = await getSingleRow(queries.getProviderById, [providerId]);

    if (!row) {
      response.status(404).json({ error: 'Provider not found' });
      return;
    }

    response.json({
      success: true,
      data: row
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
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
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// POST donation and trigger tiered thank-you + milestone follow-up notifications.
app.post('/api/donations', async (request, response) => {
  try {
    const donationInput = {
      campaignId: Number(request.body.campaignId),
      userName: String(request.body.userName || '').trim(),
      email: String(request.body.email || '').trim(),
      accountNumber: String(request.body.accountNumber || '').trim(),
      campaignUpdatesOptIn: Boolean(request.body.campaignUpdatesOptIn),
      amount: Number(request.body.amount),
      newsletterOptIn: Boolean(request.body.newsletterOptIn)
    };

    const donationValidationError = validateDonationInput(donationInput);
    if (donationValidationError) {
      response.status(400).json({
        success: false,
        error: donationValidationError
      });
      return;
    }

    const campaignRow = await getSingleRow(queries.getCampaignWithOrganizationName, [donationInput.campaignId]);
    if (!campaignRow) {
      response.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    const donationInsertResult = await runQuery(queries.insertDonation, [
      donationInput.campaignId,
      donationInput.userName,
      donationInput.email,
      donationInput.accountNumber,
      donationInput.campaignUpdatesOptIn ? 1 : 0,
      donationInput.amount,
      donationInput.newsletterOptIn ? 1 : 0
    ]);

    const donationTier = emailService.getDonationTierByAmount(donationInput.amount);
    const thankYouEmailContent = emailService.buildThankYouEmailForTier({
      donorName: donationInput.userName,
      campaignBio: campaignRow.campaign_bio,
      donationAmount: donationInput.amount,
      donationTier
    });

    await emailService.sendEmailMessage({
      recipientEmail: donationInput.email,
      subjectLine: thankYouEmailContent.subjectLine,
      messageText: thankYouEmailContent.messageText
    });

    if (donationTier === 'over_1000') {
      const dedicatedFollowUpEmail = emailService.buildDedicatedFollowUpEmail({
        donorName: donationInput.userName,
        campaignBio: campaignRow.campaign_bio
      });

      await emailService.sendEmailMessage({
        recipientEmail: donationInput.email,
        subjectLine: dedicatedFollowUpEmail.subjectLine,
        messageText: dedicatedFollowUpEmail.messageText
      });
    }

    const totalRaisedRow = await getSingleRow(queries.getCampaignTotalDonations, [donationInput.campaignId]);
    const totalRaisedAmount = Number(totalRaisedRow.total_raised || 0);
    const triggeredMilestones = await processReachedMilestones(campaignRow, totalRaisedAmount);

    response.status(201).json({
      success: true,
      data: {
        donationId: donationInsertResult.lastId,
        donationTier,
        totalRaisedAmount,
        triggeredMilestones
      }
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST campaign close notifications to donors subscribed to campaign updates.
app.post('/api/campaigns/:id/close', async (request, response) => {
  try {
    const campaignId = Number(request.params.id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      response.status(400).json({
        success: false,
        error: 'Campaign id must be a positive number'
      });
      return;
    }

    const campaignRow = await getSingleRow(queries.getCampaignWithOrganizationName, [campaignId]);
    if (!campaignRow) {
      response.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    const existingCloseEvent = await getSingleRow(queries.getCampaignEventByType, [campaignId, 'campaign_closed']);
    if (existingCloseEvent) {
      response.json({
        success: true,
        data: {
          campaignId,
          message: 'Campaign close follow-up emails were already sent earlier.'
        }
      });
      return;
    }

    const totalRaisedRow = await getSingleRow(queries.getCampaignTotalDonations, [campaignId]);
    const totalRaisedAmount = Number(totalRaisedRow.total_raised || 0);

    const campaignSubscribers = await getManyRows(queries.getCampaignUpdateSubscribers, [campaignId]);
    await Promise.all(campaignSubscribers.map(async (subscriber) => {
      const closeEmailContent = emailService.buildCampaignCloseEmail({
        donorName: subscriber.user_name || 'donor',
        campaignBio: campaignRow.campaign_bio,
        totalRaisedAmount
      });

      return emailService.sendEmailMessage({
        recipientEmail: subscriber.email,
        subjectLine: closeEmailContent.subjectLine,
        messageText: closeEmailContent.messageText
      });
    }));

    await runQuery(queries.insertCampaignEvent, [campaignId, 'campaign_closed']);

    response.json({
      success: true,
      data: {
        campaignId,
        notifiedSubscribers: campaignSubscribers.length,
        totalRaisedAmount
      }
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST newsletter emails to all newsletter-opted-in donors, optionally filtered by campaign.
app.post('/api/newsletters/send', async (request, response) => {
  try {
    const newsletterTitle = String(request.body.newsletterTitle || '').trim();
    const newsletterBody = String(request.body.newsletterBody || '').trim();
    const campaignIdFilter = request.body.campaignId ? Number(request.body.campaignId) : null;

    if (!newsletterTitle) {
      response.status(400).json({
        success: false,
        error: 'newsletterTitle is required'
      });
      return;
    }

    if (!newsletterBody) {
      response.status(400).json({
        success: false,
        error: 'newsletterBody is required'
      });
      return;
    }

    let newsletterSubscribers = [];

    if (campaignIdFilter) {
      newsletterSubscribers = await getManyRows(queries.getCampaignNewsletterSubscribers, [campaignIdFilter]);
    } else {
      newsletterSubscribers = await getManyRows(queries.getNewsletterSubscribers);
    }

    await Promise.all(newsletterSubscribers.map(async (subscriber) => {
      const newsletterEmailContent = emailService.buildNewsletterEmail({
        donorName: subscriber.user_name || 'donor',
        newsletterTitle,
        newsletterBody
      });

      return emailService.sendEmailMessage({
        recipientEmail: subscriber.email,
        subjectLine: newsletterEmailContent.subjectLine,
        messageText: newsletterEmailContent.messageText
      });
    }));

    response.json({
      success: true,
      data: {
        recipientsCount: newsletterSubscribers.length,
        campaignId: campaignIdFilter
      }
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
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