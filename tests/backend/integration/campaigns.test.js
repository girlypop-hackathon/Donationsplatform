const request = require('supertest');
const { app } = require('../../../Backend/index');
const db = require('../../../Backend/setup');

describe('Campaigns API - Integration Tests', () => {
  let testDb;

  beforeAll(async () => {
    // Initialize test database
    testDb = await db.initializeTestDatabase();
    
    // Insert a test provider for foreign key relationship
    await new Promise((resolve, reject) => {
      testDb.run(
        'INSERT INTO providers (name, logo, bio, website_link, is_organization) VALUES (?, ?, ?, ?, ?)',
        ['Test Organization', 'https://example.com/logo.jpg', 'Test bio', 'https://example.com', 1],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });

  afterAll(async () => {
    // Clean up test database
    await db.closeTestDatabase();
  });

  describe('POST /api/campaigns', () => {
    test('should create a new campaign with valid data', async () => {
      const newCampaign = {
        provider_id: 1,
        campaign_bio: 'Test Campaign for TDD',
        body_text: 'This is a test campaign created using TDD approach',
        goal_amount: 10000,
        image: 'https://example.com/campaign.jpg',
        milestone_1: '25% of goal reached',
        milestone_2: '50% of goal reached',
        milestone_3: '75% of goal reached'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(newCampaign)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('campaign_id');
      expect(response.body.data.campaign_bio).toBe(newCampaign.campaign_bio);
      expect(response.body.data.goal_amount).toBe(newCampaign.goal_amount);
      expect(response.body.data.amount_raised).toBe(0);
    });

    test('should return 400 when required fields are missing', async () => {
      const invalidCampaign = {
        // Missing provider_id, campaign_bio, and goal_amount
        body_text: 'This should fail'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(invalidCampaign)
        .expect(400);

      expect(response.body.error).toBe('provider_id, campaign_bio, and goal_amount are required');
    });

    test('should handle optional fields correctly', async () => {
      const minimalCampaign = {
        provider_id: 1,
        campaign_bio: 'Minimal Campaign',
        goal_amount: 5000
        // No image, body_text, or milestones
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(minimalCampaign)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaign_bio).toBe(minimalCampaign.campaign_bio);
      // Optional fields should be handled gracefully
    });

    test('should return 500 for invalid goal amount', async () => {
      const invalidCampaign = {
        provider_id: 1,
        campaign_bio: 'Invalid Goal Campaign',
        goal_amount: -1000 // Negative amount
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(invalidCampaign)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/campaigns', () => {
    test('should return all campaigns', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return campaign by ID', async () => {
      // First create a campaign to retrieve
      const createResponse = await request(app)
        .post('/api/campaigns')
        .send({
          provider_id: 1,
          campaign_bio: 'Campaign to Retrieve',
          goal_amount: 7500
        });

      const campaignId = createResponse.body.data.campaign_id;

      // Now retrieve the campaign
      const getResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.campaign_id).toBe(campaignId);
      expect(getResponse.body.data.campaign_bio).toBe('Campaign to Retrieve');
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/999999')
        .expect(404);

      expect(response.body.error).toBe('Campaign not found');
    });
  });
});

// Export for potential use in other test files
module.exports = {};