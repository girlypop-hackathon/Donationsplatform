// newsletters.js - API endpoints for newsletter functionality
// Handles newsletter distribution to subscribers with optional campaign filtering
const express = require("express");
const queries = require("../queries");
const emailService = require("../emailService");

const router = express.Router();

// Database connection will be passed from main endpoints.js
let db;

function setDatabase(database) {
  db = database;
}

// POST newsletter emails to all newsletter-opted-in donors, optionally filtered by campaign.
router.post("/api/newsletters/send", async (request, response) => {
  try {
    const newsletterTitle = String(request.body.newsletterTitle || "").trim();
    const newsletterBody = String(request.body.newsletterBody || "").trim();
    const campaignIdFilter = request.body.campaignId
      ? Number(request.body.campaignId)
      : null;

    if (!newsletterTitle) {
      response.status(400).json({
        success: false,
        error: "newsletterTitle is required",
      });
      return;
    }

    if (!newsletterBody) {
      response.status(400).json({
        success: false,
        error: "newsletterBody is required",
      });
      return;
    }

    let newsletterSubscribers = [];

    if (campaignIdFilter) {
      newsletterSubscribers = await getManyRows(
        queries.getCampaignNewsletterSubscribers,
        [campaignIdFilter],
      );
    } else {
      newsletterSubscribers = await getManyRows(
        queries.getNewsletterSubscribers,
      );
    }

    await Promise.all(
      newsletterSubscribers.map(async (subscriber) => {
        const newsletterEmailContent = emailService.buildNewsletterEmail({
          donorName: subscriber.user_name || "donor",
          newsletterTitle,
          newsletterBody,
        });

        return emailService.sendEmailMessage({
          recipientEmail: subscriber.email,
          subjectLine: newsletterEmailContent.subjectLine,
          messageText: newsletterEmailContent.messageText,
        });
      }),
    );

    response.json({
      success: true,
      data: {
        recipientsCount: newsletterSubscribers.length,
        campaignId: campaignIdFilter,
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
