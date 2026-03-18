/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: - SQL queries for the donation platform
*/

const queries = {
  // Organization queries
  getAllOrganizations: `SELECT * FROM organizations`,
  
  // Campaign queries
  getAllCampaigns: `SELECT * FROM campaigns`,
  
  // User/donation queries (since there's no separate users table, we'll use donations)
  getAllUsers: `SELECT DISTINCT user_name, email FROM donations`,
  
  // Additional useful queries
  getCampaignsByOrganization: `SELECT * FROM campaigns WHERE organization_id = ?`,
  getDonationsByCampaign: `SELECT * FROM donations WHERE campaign_id = ?`,
  getOrganizationById: `SELECT * FROM organizations WHERE organization_id = ?`,
  getCampaignById: `SELECT * FROM campaigns WHERE campaign_id = ?`
};

module.exports = queries;