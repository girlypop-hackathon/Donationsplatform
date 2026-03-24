/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: Centralized email helpers for thank-you emails, milestones, goal reached, campaign close and newsletters.
*/

const nodemailer = require("nodemailer");

const senderEmailAddress =
  process.env.SMTP_FROM || "no-reply@donationsplatform.local";

/**
 * Creates an SMTP transporter when all SMTP environment variables are configured.
 * Returns null when SMTP is not configured so the API can still run in development.
 */
function createSmtpTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

const smtpTransporter = createSmtpTransporter();

if (smtpTransporter) {
  console.log("[EMAIL] SMTP transporter configured", {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    from: senderEmailAddress,
  });
} else {
  console.warn(
    "[EMAIL] SMTP is not configured. Emails will be logged with EMAIL_FALLBACK_LOG instead of being sent.",
  );
}

/**
 * Sends an email through SMTP when configured, otherwise logs the message as a safe fallback.
 */
async function sendEmailMessage({ recipientEmail, subjectLine, messageText }) {
  if (!smtpTransporter) {
    console.log("[EMAIL_FALLBACK_LOG]", {
      to: recipientEmail,
      subject: subjectLine,
      text: messageText,
    });

    return {
      sent: false,
      mode: "log",
    };
  }

  await smtpTransporter.sendMail({
    from: senderEmailAddress,
    to: recipientEmail,
    subject: subjectLine,
    text: messageText,
  });

  return {
    sent: true,
    mode: "smtp",
  };
}

/**
 * Returns the donation tier used for selecting thank-you flows.
 */
function getDonationTierByAmount(donationAmount) {
  if (donationAmount < 200) {
    return "under_200";
  }

  if (donationAmount <= 1000) {
    return "between_200_and_1000";
  }

  return "over_1000";
}

/**
 * Builds a thank-you email for the donation tier requirements.
 */
function buildThankYouEmailForTier({
  donorName,
  campaignBio,
  donationAmount,
  donationTier,
}) {
  if (donationTier === "under_200") {
    return {
      subjectLine: "Thank you for your donation",
      messageText: `Hi ${donorName},\n\nThank you for your donation of ${donationAmount} DKK to "${campaignBio}". Your support means a lot.`,
    };
  }

  if (donationTier === "between_200_and_1000") {
    return {
      subjectLine: "Thank you + campaign update",
      messageText: `Hi ${donorName},\n\nThank you for your donation of ${donationAmount} DKK to "${campaignBio}".\n\nCampaign update: your support helps us move closer to the next milestone and reach more animals in need.`,
    };
  }

  return {
    subjectLine: "Thank you + personal follow-up",
    messageText: `Hi ${donorName},\n\nThank you for your generous donation of ${donationAmount} DKK to "${campaignBio}".\n\nA dedicated follow-up message will be sent to you shortly from our team.`,
  };
}

/**
 * Builds the dedicated follow-up email sent to donors above 1,000 DKK.
 */
function buildDedicatedFollowUpEmail({ donorName, campaignBio }) {
  return {
    subjectLine: "Dedicated follow-up from the campaign team",
    messageText: `Hi ${donorName},\n\nYour major support for "${campaignBio}" is deeply appreciated. We will follow up personally with progress details and impact updates from the campaign team.`,
  };
}

/**
 * Builds a milestone follow-up email for donors subscribed to campaign updates.
 */
function buildMilestoneFollowUpEmail({
  donorName,
  campaignBio,
  milestoneAmount,
  totalRaisedAmount,
}) {
  return {
    subjectLine: `Campaign milestone reached: ${milestoneAmount} DKK`,
    messageText: `Hi ${donorName},\n\nGreat news from "${campaignBio}": we just reached the milestone at ${milestoneAmount} DKK and the current total is ${totalRaisedAmount} DKK.\n\nThank you for making this possible.`,
  };
}

/**
 * Builds an email sent when a campaign reaches its full goal amount.
 */
function buildGoalReachedEmail({
  donorName,
  campaignBio,
  goalAmount,
  totalRaisedAmount,
}) {
  return {
    subjectLine: `Campaign goal reached: ${goalAmount} DKK`,
    messageText: `Hi ${donorName},\n\nAmazing news from "${campaignBio}": the campaign has reached its goal of ${goalAmount} DKK and now stands at ${totalRaisedAmount} DKK.\n\nThank you for helping us reach this target.`,
  };
}

/**
 * Builds the campaign close email for donors subscribed to campaign updates.
 */
function buildCampaignCloseEmail({
  donorName,
  campaignBio,
  totalRaisedAmount,
}) {
  return {
    subjectLine: "Campaign closed: thank you for your support",
    messageText: `Hi ${donorName},\n\n"${campaignBio}" has now closed with a final total of ${totalRaisedAmount} DKK.\n\nThank you for your support and for helping us make a real impact.`,
  };
}

/**
 * Builds a newsletter email with a short optional intro and required content body.
 */
function buildNewsletterEmail({ donorName, newsletterTitle, newsletterBody }) {
  return {
    subjectLine: newsletterTitle,
    messageText: `Hi ${donorName},\n\n${newsletterBody}\n\nYou are receiving this because you opted in to newsletter updates.`,
  };
}

/**
 * Builds the account activation email containing a single-use activation link.
 */
function buildAccountActivationEmail({ recipientName, activationLink }) {
  return {
    subjectLine: "Activate your Donations Platform account",
    messageText: `Hi ${recipientName},\n\nAn account has been created for this email on Donations Platform.\n\nActivate your account and set your password using this secure link:\n${activationLink}\n\nThe link expires in 24 hours and can only be used once.\n\nIf you did not expect this email, you can safely ignore it.`,
  };
}

module.exports = {
  buildAccountActivationEmail,
  buildCampaignCloseEmail,
  buildDedicatedFollowUpEmail,
  buildGoalReachedEmail,
  buildMilestoneFollowUpEmail,
  buildNewsletterEmail,
  buildThankYouEmailForTier,
  getDonationTierByAmount,
  sendEmailMessage,
};
