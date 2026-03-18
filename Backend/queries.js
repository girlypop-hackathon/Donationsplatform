/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: - SQL queries for the donation platform
*/

const queries = {
  // Provider queries
  getAllProviders: `SELECT * FROM providers`,
  
  // Campaign queries
  getAllCampaigns: `SELECT * FROM campaigns`,
  
  // User/donation queries (since there's no separate users table, we'll use donations)
  getAllUsers: `SELECT DISTINCT user_name, email FROM donations`,
  
  // Specific GET queries
  getCampaignsByProvider: `SELECT * FROM campaigns WHERE provider_id = ?`,
  getDonationsByCampaign: `SELECT * FROM donations WHERE campaign_id = ?`,
  getProviderById: `SELECT * FROM providers WHERE organization_id = ?`,
  getCampaignById: `SELECT * FROM campaigns WHERE campaign_id = ?`,
  
  // POST queries
  createProvider: `INSERT INTO providers (name, logo, bio, website_link, is_organization) VALUES (?, ?, ?, ?, ?)`,
  createCampaign: `INSERT INTO campaigns (provider_id, image, campaign_bio, body_text, goal_amount, milestone_1, milestone_2, milestone_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
};

module.exports = queries;