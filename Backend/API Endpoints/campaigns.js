// campaigns.js - API endpoints for campaigns table
// Handles all campaign-related operations including CRUD and provider relationships
const express = require('express')
const queries = require('../queries')

const router = express.Router()

// Database connection will be passed from main endpoints.js
let db

function setDatabase (database) {
  db = database
}

// GET all campaigns
router.get('/api/campaigns', async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllCampaignsWithProviders)
    response.json({
      success: true,
      data: rows
    })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// GET campaigns by provider ID
router.get('/api/providers/:id/campaigns', async (request, response) => {
  try {
    const providerId = Number(request.params.id)

    if (!Number.isFinite(providerId) || providerId <= 0) {
      response.status(400).json({ error: 'Valid provider id is required' })
      return
    }

    const rows = await getManyRows(queries.getCampaignsByProvider, [providerId])
    response.json({
      success: true,
      data: rows
    })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// GET campaign by ID
router.get('/api/campaigns/:id', async (request, response) => {
  try {
    const campaignId = request.params.id
    const row = await getSingleRow(queries.getCampaignWithProviderName, [campaignId])

    if (!row) {
      response.status(404).json({ error: 'Campaign not found' })
      return
    }

    response.json({
      success: true,
      data: row
    })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// POST create new campaign
router.post('/api/campaigns', (req, res) => {
  const {
    provider_id,
    image,
    campaign_bio,
    body_text,
    goal_amount,
    amount_raised,
    milestone_1,
    milestone_2,
    milestone_3
  } = req.body

  if (!provider_id || !campaign_bio || !goal_amount) {
    return res.status(400).json({ error: 'provider_id, campaign_bio, and goal_amount are required' })
  }

  db.run(
    queries.createCampaign,
    [
      provider_id,
      image,
      campaign_bio,
      body_text,
      goal_amount,
      amount_raised || 0,
      milestone_1,
      milestone_2,
      milestone_3
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message })
        return
      }
      res.status(201).json({
        success: true,
        data: {
          campaign_id: this.lastID,
          provider_id,
          image,
          campaign_bio,
          body_text,
          goal_amount,
          amount_raised: amount_raised || 0,
          milestone_1,
          milestone_2,
          milestone_3
        }
      })
    }
  )
})

// Helper functions
function getSingleRow (queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.get(queryText, queryParams, (error, row) => {
      if (error) {
        reject(error)
        return
      }
      resolve(row)
    })
  })
}

function getManyRows (queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.all(queryText, queryParams, (error, rows) => {
      if (error) {
        reject(error)
        return
      }
      resolve(rows)
    })
  })
}

module.exports = { router, setDatabase }
