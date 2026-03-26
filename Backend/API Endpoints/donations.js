/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: API endpoints for donations including anonymous donor handling

// donations.js - API endpoints for donations table
// Handles all donation-related operations including user management, email notifications, and milestone processing
*/

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

// Normalizes campaign donation payload and overwrites personal fields for anonymous donations.
function buildCampaignDonationRecord(requestBody) {
  const isAnonymousDonation = Boolean(requestBody?.anonymous_donation);
  const anonymousValue = "Anonymous";

  return {
    userName: isAnonymousDonation
      ? anonymousValue
      : requestBody?.user_name || anonymousValue,
    email: isAnonymousDonation ? anonymousValue : requestBody?.email || "",
    accountNumber: isAnonymousDonation
      ? anonymousValue
      : requestBody?.account_number || "",
    isSubscription: isAnonymousDonation
      ? false
      : Boolean(requestBody?.is_subscription),
    generalNewsletter: isAnonymousDonation
      ? false
      : Boolean(requestBody?.general_newsletter),
    isAnonymousDonation,
  };
}

// Validates whether an email value is deliverable for outbound mail.
function hasDeliverableEmailAddress(emailAddress) {
  const normalizedEmailAddress = String(emailAddress || "").trim();
  return normalizedEmailAddress.includes("@");
}

// Inserts donation, sends tiered thank-you flow, and triggers milestone or goal notifications.
async function processDonationAndEmailFlow(donationInput) {
  const donationValidationError = validateDonationInput(donationInput);
  if (donationValidationError) {
    return {
      success: false,
      statusCode: 400,
      error: donationValidationError,
    };
  }

  const campaignRow = await getSingleRow(queries.getCampaignWithProviderName, [
    donationInput.campaignId,
  ]);
  if (!campaignRow) {
    return {
      success: false,
      statusCode: 404,
      error: "Campaign not found",
    };
  }

  const donationInsertResult = await runQuery(queries.insertDonation, [
    donationInput.campaignId,
    donationInput.userId,
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

  if (hasDeliverableEmailAddress(donationInput.email)) {
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
  }

  const totalRaisedRow = await getSingleRow(queries.getCampaignTotalDonations, [
    donationInput.campaignId,
  ]);
  const totalRaisedAmount = Number(totalRaisedRow.total_raised || 0);

  await runQuery(
    "UPDATE campaigns SET amount_raised = ? WHERE campaign_id = ?",
    [totalRaisedAmount, donationInput.campaignId],
  );

  const previousTotalRaisedAmount = Math.max(
    0,
    totalRaisedAmount - donationInput.amount,
  );
  const triggeredMilestones = await processReachedMilestones(
    campaignRow,
    previousTotalRaisedAmount,
    totalRaisedAmount,
  );

  return {
    success: true,
    statusCode: 201,
    data: {
      donationId: donationInsertResult.lastId,
      campaignId: donationInput.campaignId,
      userName: donationInput.userName,
      email: donationInput.email,
      accountNumber: donationInput.accountNumber,
      isSubscription: donationInput.campaignUpdatesOptIn,
      amount: donationInput.amount,
      generalNewsletter: donationInput.newsletterOptIn,
      isAnonymousDonation: donationInput.isAnonymousDonation,
      donationTier,
      totalRaisedAmount,
      triggeredMilestones,
    },
  };
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
      isAnonymousDonation: false,
    };

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

    donationInput.userId = userResult.user.user_id;

    const donationResult = await processDonationAndEmailFlow(donationInput);
    if (!donationResult.success) {
      response.status(donationResult.statusCode).json({
        success: false,
        error: donationResult.error,
      });
      return;
    }

    if (userResult.newlyActivatable) {
      await authHelpers.sendActivationEmailForUser(userResult.user);
    }

    response.status(201).json({
      success: true,
      data: donationResult.data,
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST donation for campaign and trigger tiered thank-you + milestone follow-up notifications.
router.post("/api/campaigns/:id/donations", async (request, response) => {
  try {
    if (!authHelpers) {
      response.status(500).json({ error: "Auth helpers are not configured" });
      return;
    }

    const normalizedCampaignDonation = buildCampaignDonationRecord(
      request.body,
    );
    const donationInput = {
      campaignId: Number(request.params.id),
      userName: String(normalizedCampaignDonation.userName || "").trim(),
      email: String(normalizedCampaignDonation.email || "").trim(),
      accountNumber: String(
        normalizedCampaignDonation.accountNumber || "",
      ).trim(),
      campaignUpdatesOptIn: normalizedCampaignDonation.isSubscription,
      amount: Number(request.body?.amount),
      newsletterOptIn: normalizedCampaignDonation.generalNewsletter,
      isAnonymousDonation: normalizedCampaignDonation.isAnonymousDonation,
      userId: null,
    };

    let userResult = null;
    if (!donationInput.isAnonymousDonation) {
      userResult = await authHelpers.findOrCreateUserForEmail({
        email: donationInput.email,
        name: donationInput.userName,
      });

      if (!userResult.ok) {
        response.status(400).json({ error: userResult.error });
        return;
      }

      donationInput.userId = userResult.user.user_id;
    }

    const donationResult = await processDonationAndEmailFlow(donationInput);
    if (!donationResult.success) {
      response
        .status(donationResult.statusCode)
        .json({ error: donationResult.error });
      return;
    }

    if (userResult?.newlyActivatable) {
      try {
        await authHelpers.sendActivationEmailForUser(userResult.user);
      } catch (emailError) {
        console.error(
          "Could not send activation email after donation:",
          emailError.message,
        );
      }
    }

    response.status(201).json({
      success: true,
      data: {
        donation_id: donationResult.data.donationId,
        campaign_id: donationResult.data.campaignId,
        user_id: donationInput.userId,
        user_name: donationResult.data.userName,
        email: donationResult.data.email,
        account_number: donationResult.data.accountNumber,
        is_subscription: donationResult.data.isSubscription,
        amount: donationResult.data.amount,
        general_newsletter: donationResult.data.generalNewsletter,
        amount_raised: donationResult.data.totalRaisedAmount,
      },
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
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

  if (
    !donationInput.isAnonymousDonation &&
    (!donationInput.email || !donationInput.email.includes("@"))
  ) {
    return "email is required and must be a valid email address";
  }

  if (!Number.isFinite(donationInput.amount) || donationInput.amount <= 0) {
    return "amount must be a positive number";
  }

  return null;
}

async function getReachedMilestoneEvents(
  campaignRow,
  previousTotalRaisedAmount,
  totalRaisedAmount,
) {
  const reachedMilestoneEvents = [];

  function didCrossThreshold(thresholdAmount) {
    return (
      previousTotalRaisedAmount < thresholdAmount &&
      totalRaisedAmount >= thresholdAmount
    );
  }

  if (
    Number(campaignRow.milestone_1) > 0 &&
    didCrossThreshold(Number(campaignRow.milestone_1))
  ) {
    reachedMilestoneEvents.push({
      eventType: "milestone_1_reached",
      milestoneAmount: Number(campaignRow.milestone_1),
    });
  }

  if (
    Number(campaignRow.milestone_2) > 0 &&
    didCrossThreshold(Number(campaignRow.milestone_2))
  ) {
    reachedMilestoneEvents.push({
      eventType: "milestone_2_reached",
      milestoneAmount: Number(campaignRow.milestone_2),
    });
  }

  if (
    Number(campaignRow.milestone_3) > 0 &&
    didCrossThreshold(Number(campaignRow.milestone_3))
  ) {
    reachedMilestoneEvents.push({
      eventType: "milestone_3_reached",
      milestoneAmount: Number(campaignRow.milestone_3),
    });
  }

  if (
    Number(campaignRow.goal_amount) > 0 &&
    didCrossThreshold(Number(campaignRow.goal_amount))
  ) {
    reachedMilestoneEvents.push({
      eventType: "goal_reached",
      milestoneAmount: Number(campaignRow.goal_amount),
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

async function processReachedMilestones(
  campaignRow,
  previousTotalRaisedAmount,
  totalRaisedAmount,
) {
  const reachedMilestones = await getReachedMilestoneEvents(
    campaignRow,
    previousTotalRaisedAmount,
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

    let milestoneSendStats;
    if (reachedMilestone.eventType === "goal_reached") {
      milestoneSendStats = await sendGoalReachedEmailsToDonors({
        campaignId: campaignRow.campaign_id,
        campaignBio: campaignRow.campaign_bio,
        goalAmount: reachedMilestone.milestoneAmount,
        totalRaisedAmount,
      });
    } else {
      milestoneSendStats = await sendMilestoneEmailsToSubscribers({
        campaignId: campaignRow.campaign_id,
        campaignBio: campaignRow.campaign_bio,
        milestoneAmount: reachedMilestone.milestoneAmount,
        totalRaisedAmount,
      });
    }

    triggeredMilestones.push({
      eventType: reachedMilestone.eventType,
      milestoneAmount: reachedMilestone.milestoneAmount,
      notifiedSubscribers: milestoneSendStats.notifiedSubscribers,
    });
  }

  return triggeredMilestones;
}

async function sendGoalReachedEmailsToDonors({
  campaignId,
  campaignBio,
  goalAmount,
  totalRaisedAmount,
}) {
  const campaignDonors = await getManyRows(queries.getCampaignDonorsWithEmail, [
    campaignId,
  ]);

  const sendResults = await Promise.all(
    campaignDonors.map(async (donor) => {
      const emailContent = emailService.buildGoalReachedEmail({
        donorName: donor.user_name || "donor",
        campaignBio,
        goalAmount,
        totalRaisedAmount,
      });

      return emailService.sendEmailMessage({
        recipientEmail: donor.email,
        subjectLine: emailContent.subjectLine,
        messageText: emailContent.messageText,
      });
    }),
  );

  return {
    notifiedSubscribers: campaignDonors.length,
    smtpSentCount: sendResults.filter((result) => result.sent).length,
  };
}

module.exports = { router, setDatabase, setAuthHelpers };
