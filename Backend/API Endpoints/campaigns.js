// campaigns.js - API endpoints for campaigns table
// Handles all campaign-related operations including CRUD and provider relationships
const express = require("express");
const queries = require("../queries");

const router = express.Router();

// Database connection will be passed from main endpoints.js
let db;
let authHelpers = null;

function setDatabase(database) {
  db = database;
}

function setAuthHelpers(helpers) {
  authHelpers = helpers;
}

// GET all campaigns
router.get("/api/campaigns", async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllCampaignsWithProviders);
    response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET campaigns by provider ID
router.get("/api/providers/:id/campaigns", async (request, response) => {
  try {
    const providerId = Number(request.params.id);

    if (!Number.isFinite(providerId) || providerId <= 0) {
      response.status(400).json({ error: "Valid provider id is required" });
      return;
    }

    const rows = await getManyRows(queries.getCampaignsByProvider, [
      providerId,
    ]);
    response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET campaigns created by a specific user
router.get("/api/users/:id/campaigns", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (!Number.isFinite(userId) || userId <= 0) {
      response.status(400).json({ error: "Valid user id is required" });
      return;
    }

    const rows = await getManyRows(
      `SELECT
        campaigns.*, 
        COALESCE(campaigns.amount_raised, 0) AS amount_raised,
        providers.name AS provider_name
      FROM campaigns
      LEFT JOIN providers ON campaigns.provider_id = providers.organization_id
      WHERE campaigns.created_by_user_id = ?
      ORDER BY campaigns.campaign_id DESC`,
      [userId],
    );

    response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET campaign analytics for a specific user
router.get("/api/users/:id/campaigns/analytics", async (request, response) => {
  try {
    const userId = Number(request.params.id);

    if (!Number.isFinite(userId) || userId <= 0) {
      response.status(400).json({ error: "Valid user id is required" });
      return;
    }

    const summary = await getSingleRow(
      `SELECT
         COUNT(DISTINCT campaigns.campaign_id) AS campaigns_count,
         COUNT(donations.donation_id) AS donations_count,
         COALESCE(SUM(donations.amount), 0) AS total_raised,
         COALESCE(AVG(donations.amount), 0) AS average_donation
       FROM campaigns
       LEFT JOIN donations ON donations.campaign_id = campaigns.campaign_id
       WHERE campaigns.created_by_user_id = ?`,
      [userId],
    );

    const recentDonations = await getManyRows(
      `SELECT
         donations.donation_id,
         donations.amount,
         donations.user_name,
         donations.email,
         donations.created_at,
         campaigns.campaign_id,
         campaigns.campaign_bio,
         campaigns.image
       FROM donations
       JOIN campaigns ON campaigns.campaign_id = donations.campaign_id
       WHERE campaigns.created_by_user_id = ?
       ORDER BY donations.created_at DESC, donations.donation_id DESC
       LIMIT 8`,
      [userId],
    );

    response.json({
      success: true,
      data: {
        summary: {
          campaignsCount: Number(summary?.campaigns_count || 0),
          donationsCount: Number(summary?.donations_count || 0),
          totalRaised: Number(summary?.total_raised || 0),
          averageDonation: Number(summary?.average_donation || 0),
        },
        recentDonations,
      },
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET campaign by ID
router.get("/api/campaigns/:id", async (request, response) => {
  try {
    const campaignId = request.params.id;
    const row = await getSingleRow(queries.getCampaignWithProviderName, [
      campaignId,
    ]);

    if (!row) {
      response.status(404).json({ error: "Campaign not found" });
      return;
    }

    response.json({
      success: true,
      data: row,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// POST create new campaign
router.post("/api/campaigns", async (req, res) => {
  const {
    provider_id,
    image,
    campaign_bio,
    body_text,
    goal_amount,
    amount_raised,
    milestone_1,
    milestone_2,
    milestone_3,
    creator_name,
    creator_email,
  } = req.body;

  if (!provider_id || !campaign_bio || !goal_amount || !creator_email) {
    return res
      .status(400)
      .json({
        error:
          "provider_id, campaign_bio, goal_amount and creator_email are required",
      });
  }

  if (!authHelpers) {
    return res.status(500).json({ error: "Auth helpers are not configured" });
  }

  try {
    const userResult = await authHelpers.findOrCreateUserForEmail({
      email: creator_email,
      name: creator_name,
    });

    if (!userResult.ok) {
      return res.status(400).json({ error: userResult.error });
    }

    const insertResult = await runQuery(
      `INSERT INTO campaigns (
        provider_id,
        image,
        campaign_bio,
        body_text,
        goal_amount,
        amount_raised,
        milestone_1,
        milestone_2,
        milestone_3,
        deadline,
        created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provider_id,
        image,
        campaign_bio,
        body_text,
        goal_amount,
        amount_raised || 0,
        milestone_1,
        milestone_2,
        milestone_3,
        deadline,
        userResult.user.user_id,
      ],
    );

    if (userResult.newlyActivatable) {
      await authHelpers.sendActivationEmailForUser(userResult.user);
    }

    return res.status(201).json({
      success: true,
      data: {
        campaign_id: insertResult.lastId,
        provider_id,
        image,
        campaign_bio,
        body_text,
        goal_amount,
        amount_raised: amount_raised || 0,
        milestone_1,
        milestone_2,
        milestone_3,
        deadline,
        created_by_user_id: userResult.user.user_id,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

function runQuery(queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.run(queryText, queryParams, function onQueryRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        changes: this.changes,
        lastId: this.lastID,
      });
    });
  });
}

// Helper functions
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

module.exports = { router, setDatabase, setAuthHelpers };
