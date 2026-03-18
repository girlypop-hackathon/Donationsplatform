/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: - SQL queries for the donation platform
*/

const queries = {
  // Provider queries
  getAllProviders: `SELECT * FROM providers`,
  
  // Campaign queries
  getAllCampaigns: `SELECT *, COALESCE(NULLIF(provider_id, 0), organization_id) AS provider_id, COALESCE(amount_raised, 0) AS amount_raised FROM campaigns`,
  
  // User/donation queries (since there's no separate users table, we'll use donations)
  getAllUsers: `SELECT DISTINCT user_name, email FROM donations`,
  
  // Specific GET queries
  getCampaignsByProvider: `SELECT *, COALESCE(NULLIF(provider_id, 0), organization_id) AS provider_id, COALESCE(amount_raised, 0) AS amount_raised FROM campaigns WHERE COALESCE(NULLIF(provider_id, 0), organization_id) = ?`,
  getDonationsByCampaign: `SELECT * FROM donations WHERE campaign_id = ?`,
  getProviderById: `SELECT * FROM providers WHERE organization_id = ?`,
  getCampaignById: `SELECT *, COALESCE(NULLIF(provider_id, 0), organization_id) AS provider_id, COALESCE(amount_raised, 0) AS amount_raised FROM campaigns WHERE campaign_id = ?`,
  
  // POST queries
  createProvider: `INSERT INTO providers (name, logo, bio, website_link, is_organization) VALUES (?, ?, ?, ?, ?)`,
  createCampaign: `INSERT INTO campaigns (provider_id, image, campaign_bio, body_text, goal_amount, amount_raised, milestone_1, milestone_2, milestone_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  createDonation: `INSERT INTO donations (campaign_id, user_name, email, account_number, is_subscription, amount, general_newsletter) VALUES (?, ?, ?, ?, ?, ?, ?)`
};

module.exports = queries;