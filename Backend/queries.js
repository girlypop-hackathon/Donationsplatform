/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: - SQL queries for the donation platform
*/

const queries = {
  // Provider queries
  getAllProviders: 'SELECT * FROM providers',

  // Campaign queries
  getAllCampaigns:
    'SELECT *, COALESCE(NULLIF(provider_id, 0), organization_id) AS provider_id, COALESCE(amount_raised, 0) AS amount_raised FROM campaigns',

  // User/donation queries (since there's no separate users table, we'll use donations)
  getAllUsers: 'SELECT DISTINCT user_name, email FROM donations',

  // Specific GET queries
  getCampaignsByProvider:
    'SELECT *, COALESCE(NULLIF(provider_id, 0), organization_id) AS provider_id, COALESCE(amount_raised, 0) AS amount_raised FROM campaigns WHERE COALESCE(NULLIF(provider_id, 0), organization_id) = ?',
  getDonationsByCampaign: 'SELECT * FROM donations WHERE campaign_id = ?',
  getProviderById: 'SELECT * FROM providers WHERE organization_id = ?',
  getCampaignById: 'SELECT * FROM campaigns WHERE campaign_id = ?',

  // Donation write and campaign progress queries
  insertDonation: `INSERT INTO donations (
    campaign_id,
    user_name,
    email,
    account_number,
    is_subscription,
    amount,
    general_newsletter
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  getCampaignWithProviderName: `SELECT
    campaigns.*, providers.name AS provider_name
  FROM campaigns
  LEFT JOIN providers ON campaigns.provider_id = providers.organization_id
  WHERE campaigns.campaign_id = ?`,
  getCampaignTotalDonations: `SELECT COALESCE(SUM(amount), 0) AS total_raised
  FROM donations
  WHERE campaign_id = ?`,

  // Email subscription and audience queries
  getCampaignUpdateSubscribers: `SELECT DISTINCT email, user_name
  FROM donations
  WHERE campaign_id = ?
    AND is_subscription = 1
    AND email IS NOT NULL
    AND TRIM(email) != ''`,
  getNewsletterSubscribers: `SELECT DISTINCT email, user_name
  FROM donations
  WHERE general_newsletter = 1
    AND email IS NOT NULL
    AND TRIM(email) != ''`,
  getCampaignNewsletterSubscribers: `SELECT DISTINCT email, user_name
  FROM donations
  WHERE campaign_id = ?
    AND general_newsletter = 1
    AND email IS NOT NULL
    AND TRIM(email) != ''`,

  // Campaign event tracking to avoid duplicate milestone notifications
  getCampaignEventByType: `SELECT event_id
  FROM campaign_events
  WHERE campaign_id = ? AND event_type = ?`,
  insertCampaignEvent: `INSERT INTO campaign_events (campaign_id, event_type)
  VALUES (?, ?)`,

  // POST queries
  createProvider:
    'INSERT INTO providers (name, logo, bio, website_link, is_organization) VALUES (?, ?, ?, ?, ?)',
  createCampaign:
    'INSERT INTO campaigns (provider_id, image, campaign_bio, body_text, goal_amount, amount_raised, milestone_1, milestone_2, milestone_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  createDonation:
    'INSERT INTO donations (campaign_id, user_name, email, account_number, is_subscription, amount, general_newsletter) VALUES (?, ?, ?, ?, ?, ?, ?)'
}

module.exports = queries
