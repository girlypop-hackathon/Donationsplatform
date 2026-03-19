/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: - Simple test script for the API endpoints
*/

const axios = require('axios')

async function testEndpoints () {
  const baseUrl = 'http://localhost:3000/api'

  console.log('Testing API endpoints...\n')

  try {
    // Test GET all providers
    console.log('1. Testing GET /api/providers')
    const providersResponse = await axios.get(`${baseUrl}/providers`)
    console.log(
      '✓ Providers:',
      providersResponse.data.data.length,
      'records found'
    )
    console.log('  Sample:', providersResponse.data.data[0].name)

    // Test GET all campaigns
    console.log('\n2. Testing GET /api/campaigns')
    const campaignsResponse = await axios.get(`${baseUrl}/campaigns`)
    console.log(
      '✓ Campaigns:',
      campaignsResponse.data.data.length,
      'records found'
    )
    console.log('  Sample:', campaignsResponse.data.data[0].campaign_bio)

    // Test GET all users
    console.log('\n3. Testing GET /api/users')
    const usersResponse = await axios.get(`${baseUrl}/users`)
    console.log('✓ Users:', usersResponse.data.data.length, 'records found')
    console.log('  Sample:', usersResponse.data.data[0].user_name)

    // Test POST donation with tiered email trigger
    console.log('\n4. Testing POST /api/donations')
    const donationResponse = await axios.post(`${baseUrl}/donations`, {
      campaignId: 1,
      userName: 'API Test Donor',
      email: 'apitest@example.com',
      accountNumber: '000111222',
      campaignUpdatesOptIn: true,
      amount: 250,
      newsletterOptIn: true
    })
    console.log(
      '✓ Donation created with ID:',
      donationResponse.data.data.donationId
    )
    console.log('  Tier selected:', donationResponse.data.data.donationTier)

    // Test POST newsletter send endpoint
    console.log('\n5. Testing POST /api/newsletters/send')
    const newsletterResponse = await axios.post(`${baseUrl}/newsletters/send`, {
      newsletterTitle: 'Automated API Test Newsletter',
      newsletterBody:
        'This is a test newsletter message from the API test script.'
    })
    console.log(
      '✓ Newsletter recipients:',
      newsletterResponse.data.data.recipientsCount
    )

    // Test POST campaign close follow-up endpoint
    console.log('\n6. Testing POST /api/campaigns/:id/close')
    const closeResponse = await axios.post(`${baseUrl}/campaigns/1/close`)
    console.log(
      '✓ Campaign close endpoint response:',
      closeResponse.data.success ? 'ok' : 'failed'
    )

    console.log('\n✅ All tested endpoints are working correctly!')
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
      console.error('Response status:', error.response.status)
    }
  }
}

// Run tests
testEndpoints()
