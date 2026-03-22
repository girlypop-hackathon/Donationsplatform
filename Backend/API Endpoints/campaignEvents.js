// campaignEvents.js - API endpoints for campaign_events table
// Handles campaign lifecycle events including closing campaigns and sending notifications
const express = require("express");
const queries = require("../queries");
const emailService = require("../emailService");

const router = express.Router();

// Database connection will be passed from main endpoints.js
let db;

function setDatabase(database) {
  db = database;
}

// POST campaign close notifications to donors subscribed to campaign updates.
router.post("/api/campaigns/:id/close", async (request, response) => {
  try {
    const campaignId = Number(request.params.id);
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      response.status(400).json({
        success: false,
        error: "Campaign id must be a positive number",
      });
      return;
    }

    const campaignRow = await getSingleRow(
      queries.getCampaignWithProviderName,
      [campaignId],
    );
    if (!campaignRow) {
      response.status(404).json({
        success: false,
        error: "Campaign not found",
      });
      return;
    }

    const existingCloseEvent = await getSingleRow(
      queries.getCampaignEventByType,
      [campaignId, "campaign_closed"],
    );
    if (existingCloseEvent) {
      response.json({
        success: true,
        data: {
          campaignId,
          message: "Campaign close follow-up emails were already sent earlier.",
        },
      });
      return;
    }

    const totalRaisedRow = await getSingleRow(
      queries.getCampaignTotalDonations,
      [campaignId],
    );
    const totalRaisedAmount = Number(totalRaisedRow.total_raised || 0);

    const campaignSubscribers = await getManyRows(
      queries.getCampaignUpdateSubscribers,
      [campaignId],
    );
    await Promise.all(
      campaignSubscribers.map(async (subscriber) => {
        const closeEmailContent = emailService.buildCampaignCloseEmail({
          donorName: subscriber.user_name || "donor",
          campaignBio: campaignRow.campaign_bio,
          totalRaisedAmount,
        });

        return emailService.sendEmailMessage({
          recipientEmail: subscriber.email,
          subjectLine: closeEmailContent.subjectLine,
          messageText: closeEmailContent.messageText,
        });
      }),
    );

    await runQuery(queries.insertCampaignEvent, [
      campaignId,
      "campaign_closed",
    ]);

    response.json({
      success: true,
      data: {
        campaignId,
        notifiedSubscribers: campaignSubscribers.length,
        totalRaisedAmount,
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper functions
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

module.exports = { router, setDatabase };
