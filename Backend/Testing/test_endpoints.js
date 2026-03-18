/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: - Simple test script for the API endpoints
*/

const axios = require('axios');

async function testEndpoints() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('Testing API endpoints...\n');
  
  try {
    // Test GET all organizations
    console.log('1. Testing GET /api/organizations');
    const organizationsResponse = await axios.get(`${baseUrl}/organizations`);
    console.log('✓ Organizations:', organizationsResponse.data.data.length, 'records found');
    console.log('  Sample:', organizationsResponse.data.data[0].name);
    
    // Test GET all campaigns
    console.log('\n2. Testing GET /api/campaigns');
    const campaignsResponse = await axios.get(`${baseUrl}/campaigns`);
    console.log('✓ Campaigns:', campaignsResponse.data.data.length, 'records found');
    console.log('  Sample:', campaignsResponse.data.data[0].campaign_bio);
    
    // Test GET all users
    console.log('\n3. Testing GET /api/users');
    const usersResponse = await axios.get(`${baseUrl}/users`);
    console.log('✓ Users:', usersResponse.data.data.length, 'records found');
    console.log('  Sample:', usersResponse.data.data[0].user_name);
    
    console.log('\n✅ All basic endpoints are working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run tests
testEndpoints();