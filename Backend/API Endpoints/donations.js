// donations.js - API endpoints for donations table
// Handles all donation-related operations including user management, email notifications, and milestone processing
const express = require("express");
const queries = require("../queries");
const emailService = require("../emailService");

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

// GET all users (from donations table)
router.get("/api/users", async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllUsers);
    response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET donations by campaign ID
router.get("/api/campaigns/:id/donations", async (request, response) => {
  try {
    const campaignId = request.params.id;
    const rows = await getManyRows(queries.getDonationsByCampaign, [
      campaignId,
    ]);
    response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// POST donation and trigger tiered thank-you + milestone follow-up notifications.
router.post("/api/donations", async (request, response) => {
  try {
    const donationInput = {
      campaignId: Number(request.body.campaignId),
      userName: String(request.body.userName || "").trim(),
      email: String(request.body.email || "").trim(),
      accountNumber: String(request.body.accountNumber || "").trim(),
      campaignUpdatesOptIn: Boolean(request.body.campaignUpdatesOptIn),
      amount: Number(request.body.amount),
      newsletterOptIn: Boolean(request.body.newsletterOptIn),
    };

    const donationValidationError = validateDonationInput(donationInput);
    if (donationValidationError) {
      response.status(400).json({
        success: false,
        error: donationValidationError,
      });
      return;
    }

    if (!authHelpers) {
      response.status(500).json({
        success: false,
        error: "Auth helpers are not configured",
      });
      return;
    }

    const userResult = await authHelpers.findOrCreateUserForEmail({
      email: donationInput.email,
      name: donationInput.userName,
    });
    if (!userResult.ok) {
      response.status(400).json({
        success: false,
        error: userResult.error,
      });
      return;
    }

    const campaignRow = await getSingleRow(
      queries.getCampaignWithProviderName,
      [donationInput.campaignId],
    );
    if (!campaignRow) {
      response.status(404).json({
        success: false,
        error: "Campaign not found",
      });
      return;
    }

    const donationInsertResult = await runQuery(queries.insertDonation, [
      donationInput.campaignId,
      userResult.user.user_id,
      donationInput.userName,
      donationInput.email,
      donationInput.accountNumber,
      donationInput.campaignUpdatesOptIn ? 1 : 0,
      donationInput.amount,
      donationInput.newsletterOptIn ? 1 : 0,
    ]);

    const donationTier = emailService.getDonationTierByAmount(
      donationInput.amount,
    );
    const thankYouEmailContent = emailService.buildThankYouEmailForTier({
      donorName: donationInput.userName,
      campaignBio: campaignRow.campaign_bio,
      donationAmount: donationInput.amount,
      donationTier,
    });

    await emailService.sendEmailMessage({
      recipientEmail: donationInput.email,
      subjectLine: thankYouEmailContent.subjectLine,
      messageText: thankYouEmailContent.messageText,
    });

    if (donationTier === "over_1000") {
      const dedicatedFollowUpEmail = emailService.buildDedicatedFollowUpEmail({
        donorName: donationInput.userName,
        campaignBio: campaignRow.campaign_bio,
      });

      await emailService.sendEmailMessage({
        recipientEmail: donationInput.email,
        subjectLine: dedicatedFollowUpEmail.subjectLine,
        messageText: dedicatedFollowUpEmail.messageText,
      });
    }

    const totalRaisedRow = await getSingleRow(
      queries.getCampaignTotalDonations,
      [donationInput.campaignId],
    );
    const totalRaisedAmount = Number(totalRaisedRow.total_raised || 0);
    const triggeredMilestones = await processReachedMilestones(
      campaignRow,
      totalRaisedAmount,
    );

    if (userResult.newlyActivatable) {
      await authHelpers.sendActivationEmailForUser(userResult.user);
    }

    response.status(201).json({
      success: true,
      data: {
        donationId: donationInsertResult.lastId,
        donationTier,
        totalRaisedAmount,
        triggeredMilestones,
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST donation for campaign
router.post("/api/campaigns/:id/donations", (req, res) => {
  const campaignId = Number(req.params.id);
  const amount = Number(req.body?.amount);
  const userName = req.body?.user_name || "Anonymous Donor";
  const email = req.body?.email || "";
  const accountNumber = req.body?.account_number || "";
  const isSubscription = Boolean(req.body?.is_subscription);
  const generalNewsletter = Boolean(req.body?.general_newsletter);

  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return res.status(400).json({ error: "Valid campaign id is required" });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ error: "A valid donation amount is required" });
  }

  if (!authHelpers) {
    res.status(500).json({ error: "Auth helpers are not configured" });
    return;
  }

  authHelpers
    .findOrCreateUserForEmail({
      email,
      name: userName,
    })
    .then((userResult) => {
      if (!userResult.ok) {
        res.status(400).json({ error: userResult.error });
        return null;
      }

      db.run(
        queries.createDonation,
        [
          campaignId,
          userResult.user.user_id,
          userName,
          email,
          accountNumber,
          isSubscription,
          amount,
          generalNewsletter,
        ],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          const donationId = this.lastID;

          db.run(
            "UPDATE campaigns SET amount_raised = amount_raised + ? WHERE campaign_id = ?",
            [amount, campaignId],
            async (updateErr) => {
              if (updateErr) {
                res.status(500).json({ error: updateErr.message });
                return;
              }

              if (userResult.newlyActivatable) {
                try {
                  await authHelpers.sendActivationEmailForUser(userResult.user);
                } catch (emailError) {
                  console.error(
                    "Could not send activation email after donation:",
                    emailError.message,
                  );
                }
              }

              db.get(
                "SELECT amount_raised FROM campaigns WHERE campaign_id = ?",
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
                      user_id: userResult.user.user_id,
                      user_name: userName,
                      email,
                      account_number: accountNumber,
                      is_subscription: isSubscription,
                      amount,
                      general_newsletter: generalNewsletter,
                      amount_raised: row?.amount_raised,
                    },
                  });
                },
              );
            },
          );
        },
      );

      return null;
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
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

function validateDonationInput(donationInput) {
  if (
    !Number.isFinite(donationInput.campaignId) ||
    donationInput.campaignId <= 0
  ) {
    return "campaignId must be a positive number";
  }

  if (!donationInput.userName || donationInput.userName.trim().length < 2) {
    return "userName is required and must be at least 2 characters";
  }

  if (!donationInput.email || !donationInput.email.includes("@")) {
    return "email is required and must be a valid email address";
  }

  if (!Number.isFinite(donationInput.amount) || donationInput.amount <= 0) {
    return "amount must be a positive number";
  }

  return null;
}

async function getReachedMilestoneEvents(campaignRow, totalRaisedAmount) {
  const reachedMilestoneEvents = [];

  if (
    Number(campaignRow.milestone_1) > 0 &&
    totalRaisedAmount >= Number(campaignRow.milestone_1)
  ) {
    reachedMilestoneEvents.push({
      eventType: "milestone_1_reached",
      milestoneAmount: Number(campaignRow.milestone_1),
    });
  }

  if (
    Number(campaignRow.milestone_2) > 0 &&
    totalRaisedAmount >= Number(campaignRow.milestone_2)
  ) {
    reachedMilestoneEvents.push({
      eventType: "milestone_2_reached",
      milestoneAmount: Number(campaignRow.milestone_2),
    });
  }

  if (
    Number(campaignRow.milestone_3) > 0 &&
    totalRaisedAmount >= Number(campaignRow.milestone_3)
  ) {
    reachedMilestoneEvents.push({
      eventType: "milestone_3_reached",
      milestoneAmount: Number(campaignRow.milestone_3),
    });
  }

  return reachedMilestoneEvents;
}

async function sendMilestoneEmailsToSubscribers({
  campaignId,
  campaignBio,
  milestoneAmount,
  totalRaisedAmount,
}) {
  const campaignSubscribers = await getManyRows(
    queries.getCampaignUpdateSubscribers,
    [campaignId],
  );

  const sendResults = await Promise.all(
    campaignSubscribers.map(async (subscriber) => {
      const emailContent = emailService.buildMilestoneFollowUpEmail({
        donorName: subscriber.user_name || "donor",
        campaignBio,
        milestoneAmount,
        totalRaisedAmount,
      });

      return emailService.sendEmailMessage({
        recipientEmail: subscriber.email,
        subjectLine: emailContent.subjectLine,
        messageText: emailContent.messageText,
      });
    }),
  );

  return {
    notifiedSubscribers: campaignSubscribers.length,
    smtpSentCount: sendResults.filter((result) => result.sent).length,
  };
}

async function processReachedMilestones(campaignRow, totalRaisedAmount) {
  const reachedMilestones = await getReachedMilestoneEvents(
    campaignRow,
    totalRaisedAmount,
  );
  const triggeredMilestones = [];

  for (const reachedMilestone of reachedMilestones) {
    const existingCampaignEvent = await getSingleRow(
      queries.getCampaignEventByType,
      [campaignRow.campaign_id, reachedMilestone.eventType],
    );

    if (existingCampaignEvent) {
      continue;
    }

    await runQuery(queries.insertCampaignEvent, [
      campaignRow.campaign_id,
      reachedMilestone.eventType,
    ]);

    const milestoneSendStats = await sendMilestoneEmailsToSubscribers({
      campaignId: campaignRow.campaign_id,
      campaignBio: campaignRow.campaign_bio,
      milestoneAmount: reachedMilestone.milestoneAmount,
      totalRaisedAmount,
    });

    triggeredMilestones.push({
      eventType: reachedMilestone.eventType,
      milestoneAmount: reachedMilestone.milestoneAmount,
      notifiedSubscribers: milestoneSendStats.notifiedSubscribers,
    });
  }

  return triggeredMilestones;
}

module.exports = { router, setDatabase, setAuthHelpers };
