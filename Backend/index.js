/*
Oprettet: 17-03-2026
Oprettet af: Linea og Mistral Vibe
Beskrivelse: index.js - Main entry point for the donation platform API
*/

require("dotenv").config();

const app = require("./api-router.js");

console.log("Donation Platform API is ready to serve requests!");
console.log("Available endpoints:");
console.log("- GET /api/providers - Get all providers");
console.log("- GET /api/campaigns - Get all campaigns");
console.log("- GET /api/users - Get all users");
console.log("- POST /api/auth/login - Login with email and password");
console.log("- GET /api/auth/me - Get current authenticated user");
console.log("- POST /api/auth/logout - Log out current token");
console.log("- GET /api/providers/:id - Get provider by ID");
console.log("- GET /api/campaigns/:id - Get campaign by ID");
console.log("- GET /api/providers/:id/campaigns - Get campaigns by provider");
console.log("- GET /api/campaigns/:id/donations - Get donations by campaign");
console.log(
  "- POST /api/donations - Create donation and send tiered thank-you emails",
);
console.log(
  "- POST /api/campaigns/:id/close - Send campaign close follow-up emails",
);
console.log(
  "- POST /api/newsletters/send - Send newsletters to opted-in donors",
);
console.log("- POST /api/providers - Create new provider");
console.log("- POST /api/campaigns - Create new campaign");
