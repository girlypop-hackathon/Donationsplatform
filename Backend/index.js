/*
Oprettet: 18-03-2026
Af: Linea
Beskrivelse: idk girl
*/


// index.js - Main entry point for the donation platform API
const app = require('./endpoints.js');

console.log('Donation Platform API is ready to serve requests!');
console.log('Available endpoints:');
console.log('- GET /api/organizations - Get all organizations');
console.log('- GET /api/campaigns - Get all campaigns');
console.log('- GET /api/users - Get all users');
console.log('- GET /api/organizations/:id - Get organization by ID');
console.log('- GET /api/campaigns/:id - Get campaign by ID');
console.log('- GET /api/organizations/:id/campaigns - Get campaigns by organization');
console.log('- GET /api/campaigns/:id/donations - Get donations by campaign');