// providers.js - API endpoints for providers table
// Handles all provider-related operations including CRUD and organization aliases
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const queries = require('../queries');

const router = express.Router();

// Database connection will be passed from main endpoints.js
let db;

function setDatabase(database) {
  db = database;
}

// GET all providers
router.get('/api/providers', async (request, response) => {
  try {
    const rows = await getManyRows(queries.getAllProviders);
    response.json({
      success: true,
      data: rows
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET all organizations (alias for providers)
router.get('/api/organizations', (req, res) => {
  db.all(queries.getAllProviders, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      success: true,
      data: rows
    });
  });
});

// GET provider by ID
router.get('/api/providers/:id', async (request, response) => {
  try {
    const providerId = Number(request.params.id);

    if (!Number.isFinite(providerId) || providerId <= 0) {
      response.status(400).json({ error: 'Valid provider id is required' });
      return;
    }

    const row = await getSingleRow(queries.getProviderById, [providerId]);

    if (!row) {
      response.status(404).json({ error: 'Provider not found' });
      return;
    }

    response.json({
      success: true,
      data: row
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// POST create new provider
router.post('/api/providers', (req, res) => {
  const { name, logo, bio, website_link, is_organization } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  db.run(queries.createProvider, [name, logo, bio, website_link, is_organization || true], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({
      success: true,
      data: {
        provider_id: this.lastID,
        name,
        logo,
        bio,
        website_link,
        is_organization: is_organization || true
      }
    });
  });
});

// Helper functions
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

module.exports = { router, setDatabase };