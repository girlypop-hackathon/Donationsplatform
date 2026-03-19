/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: API endpoints for the donation platform
*/

// endpoints.js - API endpoints for the donation platform
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const queries = require('./queries');
const emailService = require('./emailService');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const revokedTokens = new Set();

// Create database connection
const db = new sqlite3.Database('./donations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the donations database.');
    ensureProviderIdColumn(() => {
      ensureAmountRaisedColumn(() => {
        ensureUsersTable();
      });
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

function ensureAmountRaisedColumn(onDone) {
  db.all('PRAGMA table_info(campaigns)', [], (err, columns) => {
    if (err) {
      console.error('Could not inspect campaigns table:', err.message);
      if (onDone) onDone();
      return;
    }

    const hasAmountRaised = columns.some((column) => column.name === 'amount_raised');

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    if (hasAmountRaised) {
      if (onDone) onDone();
      return;
    }

    db.run('ALTER TABLE campaigns ADD COLUMN amount_raised REAL DEFAULT 0', (alterErr) => {
      if (alterErr) {
        console.error('Could not add amount_raised column:', alterErr.message);
        if (onDone) onDone();
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
            if (onDone) onDone();
            return;
          }

          console.log('Campaign amount_raised column was added and backfilled.');
          if (onDone) onDone();
        }
      );
    });
  });
}

function ensureUsersTable() {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    (error) => {
      if (error) {
        console.error('Could not ensure users table:', error.message);
        return;
      }

      console.log('Users table is ready.');
    }
  );
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

function normalizeEmail(rawEmail) {
  return String(rawEmail || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function buildPublicUser(userRow) {
  return {
    userId: userRow.user_id,
    name: userRow.name,
    email: userRow.email,
    status: userRow.status,
    createdAt: userRow.created_at
  };
}

function extractBearerToken(request) {
  const authorizationHeader = String(request.headers.authorization || '');
  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    return null;
  }
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

app.post('/api/auth/login', async (request, response) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || '');

    if (!isValidEmail(email) || password.length < 8) {
      response.status(400).json({
        success: false,
        error: 'email and password are required (password min 8 chars)'
      });
      return;
    }

    const userRow = await getSingleRow('SELECT * FROM users WHERE email = ?', [email]);

    if (!userRow || !userRow.password_hash) {
      response.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    const hasValidPassword = await bcrypt.compare(password, userRow.password_hash);
    if (!hasValidPassword) {
      response.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    if (String(userRow.status || '').toLowerCase() === 'disabled') {
      response.status(403).json({
        success: false,
        error: 'User account is disabled'
      });
      return;
    }

    const token = jwt.sign(
      {
        sub: userRow.user_id,
        email: userRow.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    response.json({
      success: true,
      data: {
        token,
        user: buildPublicUser(userRow)
      }
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/auth/me', async (request, response) => {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      response.status(401).json({
        success: false,
        error: 'Authorization token is required'
      });
      return;
    }

    if (revokedTokens.has(token)) {
      response.status(401).json({
        success: false,
        error: 'Token has been logged out'
      });
      return;
    }

    const tokenPayload = verifyToken(token);
    if (!tokenPayload || !tokenPayload.sub) {
      response.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    const userRow = await getSingleRow('SELECT * FROM users WHERE user_id = ?', [tokenPayload.sub]);
    if (!userRow) {
      response.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    response.json({
      success: true,
      data: {
        user: buildPublicUser(userRow)
      }
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/auth/logout', (request, response) => {
  const token = extractBearerToken(request);

  if (token) {
    revokedTokens.add(token);
  }

  response.json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  });
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
    const providerId = Number(request.params.id);

    if (!Number.isFinite(providerId) || providerId <= 0) {
      response.status(400).json({ error: 'Valid provider id is required' });
      return;
    }

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
    const providerId = Number(request.params.id);

    if (!Number.isFinite(providerId) || providerId <= 0) {
      response.status(400).json({ error: 'Valid provider id is required' });
      return;
    }

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
app.get('/api/campaigns/:id', async (request, response) => {
  try {
    const campaignId = request.params.id;
    const row = await getSingleRow(queries.getCampaignById, [campaignId]);

    if (!row) {
      response.status(404).json({ error: 'Campaign not found' });
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

    const campaignRow = await getSingleRow(queries.getCampaignWithProviderName, [donationInput.campaignId]);
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

    const campaignRow = await getSingleRow(queries.getCampaignWithProviderName, [campaignId]);
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