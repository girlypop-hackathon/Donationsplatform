/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: API endpoints for the donation platform

Note: this file needs cleanup regarding to many tests for provider_id - check if we already have it = no need for all this lenght
*/

// endpoints.js - Main API entry point for the donation platform
// Orchestrates modular endpoint files and handles database setup
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const queries = require("./queries");
const emailService = require("./emailService");

// Import modular endpoint files
const providersEndpoints = require("./API Endpoints/providers");
const campaignsEndpoints = require("./API Endpoints/campaigns");
const donationsEndpoints = require("./API Endpoints/donations");
const campaignEventsEndpoints = require("./API Endpoints/campaignEvents");
const newslettersEndpoints = require("./API Endpoints/newsletters");

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const FRONTEND_PUBLIC_URL =
  process.env.FRONTEND_PUBLIC_URL || "http://localhost:5173";
const ACTIVATION_TOKEN_TTL_HOURS = Number(
  process.env.ACTIVATION_TOKEN_TTL_HOURS || 24,
);
const revokedTokens = new Set();

// Always resolve DB relative to Backend directory so cwd does not change DB target.
const databasePath = path.join(__dirname, "donations.db");

// Create database connection
const db = new sqlite3.Database(databasePath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to the donations database.");
    ensureProviderIdColumn(() => {
      ensureAmountRaisedColumn(() => {
        ensureCampaignDeadlineColumn(() => {
          ensureCampaignCategoryColumn(() => {
            ensureDonationCreatedAtColumn(() => {
              ensureUsersTable(() => {
                ensureUserLinkColumns(() => {
                  ensureActivationTokensTable();
                });
              });
            });
          });
        });
      });
    });
  }
});

function ensureProviderIdColumn(onDone) {
  db.all("PRAGMA table_info(campaigns)", [], (err, columns) => {
    if (err) {
      console.error(
        "Could not inspect campaigns table for provider_id:",
        err.message,
      );
      if (onDone) onDone();
      return;
    }

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    const hasProviderId = columns.some(
      (column) => column.name === "provider_id",
    );
    const hasOrganizationId = columns.some(
      (column) => column.name === "organization_id",
    );

    // If we have provider_id, we're good to go
    if (hasProviderId) {
      console.log("provider_id column already exists.");
      if (onDone) onDone();
      return;
    }

    // If we don't have provider_id but have organization_id, migrate
    if (!hasProviderId && hasOrganizationId) {
      db.run(
        "ALTER TABLE campaigns ADD COLUMN provider_id INTEGER",
        (alterErr) => {
          if (alterErr) {
            console.error(
              "Could not add provider_id column:",
              alterErr.message,
            );
            if (onDone) onDone();
            return;
          }

          db.run(
            "UPDATE campaigns SET provider_id = organization_id",
            (updateErr) => {
              if (updateErr) {
                console.error(
                  "Could not copy organization_id to provider_id:",
                  updateErr.message,
                );
              } else {
                console.log(
                  "Campaign provider_id column was added and backfilled from organization_id.",
                );
              }
              if (onDone) onDone();
            },
          );
        },
      );
      return;
    }

    // If we have neither, just add provider_id column
    if (!hasProviderId && !hasOrganizationId) {
      db.run(
        "ALTER TABLE campaigns ADD COLUMN provider_id INTEGER",
        (alterErr) => {
          if (alterErr) {
            console.error(
              "Could not add provider_id column:",
              alterErr.message,
            );
          } else {
            console.log("Added provider_id column to campaigns table.");
          }
          if (onDone) onDone();
        },
      );
    }
  });
}

function ensureCampaignDeadlineColumn(onDone) {
  db.all("PRAGMA table_info(campaigns)", [], (err, columns) => {
    if (err) {
      console.error("Could not inspect campaigns table for deadline:", err.message);
      if (onDone) onDone();
      return;
    }

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    const hasDeadline = columns.some((column) => column.name === "deadline");
    if (hasDeadline) {
      if (onDone) onDone();
      return;
    }

    db.run("ALTER TABLE campaigns ADD COLUMN deadline TEXT", (alterErr) => {
      if (alterErr) {
        console.error("Could not add campaigns.deadline column:", alterErr.message);
      }
      if (onDone) onDone();
    });
  });
}

function ensureCampaignCategoryColumn(onDone) {
  db.all("PRAGMA table_info(campaigns)", [], (err, columns) => {
    if (err) {
      console.error("Could not inspect campaigns table for category:", err.message);
      if (onDone) onDone();
      return;
    }

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    const hasCategory = columns.some((column) => column.name === "category");
    if (hasCategory) {
      if (onDone) onDone();
      return;
    }

    db.run("ALTER TABLE campaigns ADD COLUMN category TEXT", (alterErr) => {
      if (alterErr) {
        console.error("Could not add campaigns.category column:", alterErr.message);
        if (onDone) onDone();
        return;
      }

      db.run(
        "UPDATE campaigns SET category = 'Other' WHERE category IS NULL OR TRIM(category) = ''",
        (updateErr) => {
          if (updateErr) {
            console.error(
              "Could not backfill campaigns.category values:",
              updateErr.message,
            );
          }
          if (onDone) onDone();
        },
      );
    });
  });
}

function ensureAmountRaisedColumn(onDone) {
  db.all("PRAGMA table_info(campaigns)", [], (err, columns) => {
    if (err) {
      console.error("Could not inspect campaigns table:", err.message);
      if (onDone) onDone();
      return;
    }

    const hasAmountRaised = columns.some(
      (column) => column.name === "amount_raised",
    );

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    if (hasAmountRaised) {
      if (onDone) onDone();
      return;
    }

    db.run(
      "ALTER TABLE campaigns ADD COLUMN amount_raised REAL DEFAULT 0",
      (alterErr) => {
        if (alterErr) {
          console.error(
            "Could not add amount_raised column:",
            alterErr.message,
          );
          if (onDone) onDone();
          return;
        }

        db.run(
          `UPDATE campaigns
         SET amount_raised = COALESCE(
           (SELECT SUM(amount) FROM donations WHERE donations.campaign_id = campaigns.campaign_id),
           0
         )`,
          (updateErr) => {
            if (updateErr) {
              console.error(
                "Could not backfill amount_raised values:",
                updateErr.message,
              );
              if (onDone) onDone();
              return;
            }

            console.log(
              "Campaign amount_raised column was added and backfilled.",
            );
            if (onDone) onDone();
          },
        );
      },
    );
  });
}

function ensureDonationCreatedAtColumn(onDone) {
  db.all("PRAGMA table_info(donations)", [], (err, columns) => {
    if (err) {
      console.error("Could not inspect donations table:", err.message);
      if (onDone) onDone();
      return;
    }

    if (columns.length === 0) {
      if (onDone) onDone();
      return;
    }

    const hasCreatedAt = columns.some((column) => column.name === "created_at");
    if (hasCreatedAt) {
      if (onDone) onDone();
      return;
    }

    db.run(
      "ALTER TABLE donations ADD COLUMN created_at TEXT",
      (alterErr) => {
        if (alterErr) {
          console.error("Could not add donations.created_at column:", alterErr.message);
          if (onDone) onDone();
          return;
        }

        db.run(
          `UPDATE donations
           SET created_at = CURRENT_TIMESTAMP
           WHERE created_at IS NULL OR TRIM(created_at) = ''`,
          (updateErr) => {
            if (updateErr) {
              console.error(
                "Could not backfill donations.created_at values:",
                updateErr.message,
              );
            }
            db.run(
              `CREATE TRIGGER IF NOT EXISTS donations_set_created_at
               AFTER INSERT ON donations
               FOR EACH ROW
               WHEN NEW.created_at IS NULL OR TRIM(NEW.created_at) = ''
               BEGIN
                 UPDATE donations
                 SET created_at = CURRENT_TIMESTAMP
                 WHERE donation_id = NEW.donation_id;
               END;`,
              (triggerErr) => {
                if (triggerErr) {
                  console.error(
                    "Could not ensure donations_set_created_at trigger:",
                    triggerErr.message,
                  );
                }

                if (onDone) onDone();
              },
            );
          },
        );
      },
    );
  });
}

function ensureUsersTable(onDone) {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    (error) => {
      if (error) {
        console.error("Could not ensure users table:", error.message);
        if (onDone) onDone();
        return;
      }

      console.log("Users table is ready.");
      if (onDone) onDone();
    },
  );
}

function ensureUserLinkColumns(onDone) {
  db.serialize(() => {
    db.all(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('donations', 'campaigns')",
      [],
      (tablesError, tableRows) => {
        if (tablesError) {
          console.error("Could not inspect tables for user links:", tablesError.message);
          if (onDone) onDone();
          return;
        }

        const tableNames = new Set(tableRows.map((row) => row.name));
        const hasDonationsTable = tableNames.has("donations");
        const hasCampaignsTable = tableNames.has("campaigns");

        if (!hasDonationsTable && !hasCampaignsTable) {
          if (onDone) onDone();
          return;
        }

        if (!hasDonationsTable) {
          finalizeCampaignColumnUpdate(hasCampaignsTable, onDone);
          return;
        }

        db.all("PRAGMA table_info(donations)", [], (donationTableError, columns) => {
      if (donationTableError) {
        console.error(
          "Could not inspect donations table for user_id:",
          donationTableError.message,
        );
          } else if (!columns.some((column) => column.name === "user_id")) {
            db.run(
              "ALTER TABLE donations ADD COLUMN user_id INTEGER",
              (alterError) => {
                if (alterError) {
                  console.error(
                    "Could not add user_id to donations:",
                    alterError.message,
                  );
                }
              },
            );
          }

          db.run(
            `UPDATE donations
         SET user_id = (
           SELECT users.user_id
           FROM users
           WHERE LOWER(users.email) = LOWER(donations.email)
           LIMIT 1
         )
         WHERE user_id IS NULL
           AND email IS NOT NULL
           AND TRIM(email) != ''`,
            (backfillDonationError) => {
              if (backfillDonationError) {
                console.error(
                  "Could not backfill donations.user_id:",
                  backfillDonationError.message,
                );
              }

              finalizeCampaignColumnUpdate(hasCampaignsTable, onDone);
            },
          );
        });
      },
    );
  });
}

function finalizeCampaignColumnUpdate(hasCampaignsTable, onDone) {
  if (!hasCampaignsTable) {
    if (onDone) onDone();
    return;
  }

  db.all("PRAGMA table_info(campaigns)", [], (campaignTableError, campaignColumns) => {
    if (campaignTableError) {
      console.error(
        "Could not inspect campaigns table for created_by_user_id:",
        campaignTableError.message,
      );
      if (onDone) onDone();
      return;
    }

    if (!campaignColumns.some((column) => column.name === "created_by_user_id")) {
      db.run(
        "ALTER TABLE campaigns ADD COLUMN created_by_user_id INTEGER",
        (alterCampaignError) => {
          if (alterCampaignError) {
            console.error(
              "Could not add created_by_user_id to campaigns:",
              alterCampaignError.message,
            );
          }
          if (onDone) onDone();
        },
      );
      return;
    }

    if (onDone) onDone();
  });
}

function ensureActivationTokensTable(onDone) {
  db.run(
    `CREATE TABLE IF NOT EXISTS user_activation_tokens (
      token_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id)
    )`,
    (error) => {
      if (error) {
        console.error("Could not ensure user_activation_tokens table:", error.message);
        if (onDone) onDone();
        return;
      }

      db.run(
        "CREATE INDEX IF NOT EXISTS idx_user_activation_tokens_user_id ON user_activation_tokens (user_id)",
        (indexError) => {
          if (indexError) {
            console.error(
              "Could not ensure activation token user index:",
              indexError.message,
            );
          }
          if (onDone) onDone();
        },
      );
    },
  );
}

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

function runQuery(queryText, queryParams = []) {
  return new Promise((resolve, reject) => {
    db.run(queryText, queryParams, function onQueryRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        changes: this.changes,
        lastId: this.lastID,
      });
    });
  });
}

function normalizeEmail(rawEmail) {
  return String(rawEmail || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function buildPublicUser(userRow) {
  return {
    userId: userRow.user_id,
    name: userRow.name,
    email: userRow.email,
    status: userRow.status,
    createdAt: userRow.created_at,
  };
}

function extractBearerToken(request) {
  const authorizationHeader = String(request.headers.authorization || "");
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    return null;
  }
}

function hashActivationToken(plainToken) {
  return crypto.createHash("sha256").update(plainToken).digest("hex");
}

function normalizeActivationTokenInput(rawTokenInput) {
  let normalizedTokenValue = String(rawTokenInput || "").trim();

  if (!normalizedTokenValue) {
    return "";
  }

  // Remove wrapping quotes/angle brackets commonly added by terminals or mail clients.
  normalizedTokenValue = normalizedTokenValue.replace(/^['"<\s]+|['">\s]+$/g, "");

  // If a full URL is provided instead of raw token, extract token query value.
  if (normalizedTokenValue.includes("token=")) {
    try {
      const parsedUrl = new URL(normalizedTokenValue);
      const tokenFromQuery = String(parsedUrl.searchParams.get("token") || "").trim();
      if (tokenFromQuery) {
        normalizedTokenValue = tokenFromQuery;
      }
    } catch (_error) {
      const tokenMatch = normalizedTokenValue.match(/[?&]token=([^&]+)/i);
      if (tokenMatch?.[1]) {
        normalizedTokenValue = tokenMatch[1];
      }
    }
  }

  try {
    normalizedTokenValue = decodeURIComponent(normalizedTokenValue);
  } catch (_error) {
    // Keep original token if decoding fails.
  }

  // Strip accidental trailing punctuation from copied links.
  normalizedTokenValue = normalizedTokenValue.replace(/[\s.,;:!?]+$/, "");

  // Extract token when input contains additional noise (line wraps, labels, etc.).
  const hexTokenMatch = normalizedTokenValue.match(/[a-fA-F0-9]{64}/);
  if (hexTokenMatch?.[0]) {
    normalizedTokenValue = hexTokenMatch[0];
  }

  // Generated tokens are hex strings; normalize to lowercase for robust matching.
  normalizedTokenValue = normalizedTokenValue.toLowerCase();

  return normalizedTokenValue;
}

function createActivationUrl(plainToken) {
  const normalizedBase = FRONTEND_PUBLIC_URL.replace(/\/$/, "");
  return `${normalizedBase}/activate?token=${encodeURIComponent(plainToken)}`;
}

async function findOrCreateUserForEmail({ email, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || "").trim();

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      error: "A valid email is required for account creation",
    };
  }

  let userRow = await getSingleRow("SELECT * FROM users WHERE email = ?", [
    normalizedEmail,
  ]);

  if (!userRow) {
    const insertResult = await runQuery(
      "INSERT INTO users (name, email, status) VALUES (?, ?, 'pending')",
      [normalizedName || null, normalizedEmail],
    );

    userRow = await getSingleRow("SELECT * FROM users WHERE user_id = ?", [
      insertResult.lastId,
    ]);

    return {
      ok: true,
      user: userRow,
      created: true,
      newlyActivatable: true,
    };
  }

  if (!userRow.name && normalizedName) {
    await runQuery("UPDATE users SET name = ? WHERE user_id = ?", [
      normalizedName,
      userRow.user_id,
    ]);

    userRow = await getSingleRow("SELECT * FROM users WHERE user_id = ?", [
      userRow.user_id,
    ]);
  }

  return {
    ok: true,
    user: userRow,
    created: false,
    newlyActivatable: !userRow.password_hash,
  };
}

async function issueActivationTokenForUser(userId) {
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashActivationToken(plainToken);
  const expirationDate = new Date(
    Date.now() + ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await runQuery(
    `INSERT INTO user_activation_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expirationDate],
  );

  return {
    plainToken,
    expiresAt: expirationDate,
  };
}

async function sendActivationEmailForUser(userRow) {
  if (userRow.password_hash) {
    return {
      sent: false,
      skipped: true,
      reason: "already_active",
    };
  }

  const { plainToken, expiresAt } = await issueActivationTokenForUser(
    userRow.user_id,
  );
  const activationLink = createActivationUrl(plainToken);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV_ACTIVATION_LINK] ${activationLink}`);
  }

  const activationEmail = emailService.buildAccountActivationEmail({
    recipientName: userRow.name || "there",
    activationLink,
  });

  const mailSendResult = await emailService.sendEmailMessage({
    recipientEmail: userRow.email,
    subjectLine: activationEmail.subjectLine,
    messageText: activationEmail.messageText,
  });

  return {
    sent: true,
    mode: mailSendResult.mode,
    expiresAt,
    activationLink:
      process.env.NODE_ENV !== "production" ? activationLink : undefined,
  };
}

const authHelpers = {
  findOrCreateUserForEmail,
  sendActivationEmailForUser,
};

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// Basic CORS support so local frontend can call this API during development.
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (request.method === "OPTIONS") {
    response.sendStatus(200);
    return;
  }

  next();
});

// Setup modular routers with database connection
providersEndpoints.setDatabase(db);
campaignsEndpoints.setDatabase(db);
donationsEndpoints.setDatabase(db);
campaignEventsEndpoints.setDatabase(db);
newslettersEndpoints.setDatabase(db);

if (typeof campaignsEndpoints.setAuthHelpers === "function") {
  campaignsEndpoints.setAuthHelpers(authHelpers);
}

if (typeof donationsEndpoints.setAuthHelpers === "function") {
  donationsEndpoints.setAuthHelpers(authHelpers);
}

app.post("/api/auth/login", async (request, response) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || "");

    if (!isValidEmail(email) || password.length < 8) {
      response.status(400).json({
        success: false,
        error: "email and password are required (password min 8 chars)",
      });
      return;
    }

    const userRow = await getSingleRow("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!userRow || !userRow.password_hash) {
      response.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    const hasValidPassword = await bcrypt.compare(
      password,
      userRow.password_hash,
    );
    if (!hasValidPassword) {
      response.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    if (String(userRow.status || "").toLowerCase() === "disabled") {
      response.status(403).json({
        success: false,
        error: "User account is disabled",
      });
      return;
    }

    const token = jwt.sign(
      {
        sub: userRow.user_id,
        email: userRow.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    response.json({
      success: true,
      data: {
        token,
        user: buildPublicUser(userRow),
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/auth/request-activation", async (request, response) => {
  try {
    const email = normalizeEmail(request.body.email);

    if (!isValidEmail(email)) {
      response.status(400).json({
        success: false,
        error: "A valid email is required",
      });
      return;
    }

    const userRow = await getSingleRow("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (!userRow) {
      response.status(200).json({
        success: true,
        data: {
          message:
            "If an account exists for this email, an activation email has been sent.",
        },
      });
      return;
    }

    let activationInfo = null;
    let alreadyActive = false;
    if (!userRow.password_hash) {
      activationInfo = await sendActivationEmailForUser(userRow);
    } else {
      alreadyActive = true;
    }

    response.status(200).json({
      success: true,
      data: {
        message: alreadyActive
          ? "This account is already active. Please sign in with your password."
          : "If an account exists for this email, an activation email has been sent.",
        devActivationLink: activationInfo?.activationLink,
        alreadyActive,
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/auth/activate", async (request, response) => {
  try {
    const plainToken = normalizeActivationTokenInput(request.body.token);
    const password = String(request.body.password || "");
    const displayName = String(request.body.name || "").trim();

    if (!plainToken || plainToken.length < 32) {
      response.status(400).json({
        success: false,
        error: "A valid activation token is required",
      });
      return;
    }

    if (password.length < 8) {
      response.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
      return;
    }

    const tokenHash = hashActivationToken(plainToken);
    const tokenRow = await getSingleRow(
      `SELECT user_activation_tokens.*, users.*
       FROM user_activation_tokens
       JOIN users ON users.user_id = user_activation_tokens.user_id
       WHERE user_activation_tokens.token_hash = ?
       LIMIT 1`,
      [tokenHash],
    );

    if (!tokenRow) {
      response.status(400).json({
        success: false,
        error: "Activation token is invalid. Request a new activation link and try again.",
      });
      return;
    }

    if (tokenRow.used_at) {
      const alreadyActivated = Boolean(tokenRow.password_hash);
      response.status(400).json({
        success: false,
        error: alreadyActivated
          ? "This account is already activated. Sign in with your email and password."
          : "Activation token has already been used. Request a new activation link and try again.",
      });
      return;
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      response.status(400).json({
        success: false,
        error: "Activation token has expired",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await runQuery(
      `UPDATE users
       SET password_hash = ?,
           status = 'active',
           name = COALESCE(NULLIF(?, ''), name)
       WHERE user_id = ?`,
      [passwordHash, displayName, tokenRow.user_id],
    );

    await runQuery(
      "UPDATE user_activation_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
      [tokenHash],
    );

    await runQuery(
      `UPDATE user_activation_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND used_at IS NULL`,
      [tokenRow.user_id],
    );

    const userRow = await getSingleRow("SELECT * FROM users WHERE user_id = ?", [
      tokenRow.user_id,
    ]);

    const jwtToken = jwt.sign(
      {
        sub: userRow.user_id,
        email: userRow.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    response.status(200).json({
      success: true,
      data: {
        token: jwtToken,
        user: buildPublicUser(userRow),
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/auth/me", async (request, response) => {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      response.status(401).json({
        success: false,
        error: "Authorization token is required",
      });
      return;
    }

    if (revokedTokens.has(token)) {
      response.status(401).json({
        success: false,
        error: "Token has been logged out",
      });
      return;
    }

    const tokenPayload = verifyToken(token);
    if (!tokenPayload || !tokenPayload.sub) {
      response.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    const userRow = await getSingleRow(
      "SELECT * FROM users WHERE user_id = ?",
      [tokenPayload.sub],
    );
    if (!userRow) {
      response.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    response.json({
      success: true,
      data: {
        user: buildPublicUser(userRow),
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.put("/api/auth/profile", async (request, response) => {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      response.status(401).json({
        success: false,
        error: "Authorization token is required",
      });
      return;
    }

    if (revokedTokens.has(token)) {
      response.status(401).json({
        success: false,
        error: "Token has been logged out",
      });
      return;
    }

    const tokenPayload = verifyToken(token);
    if (!tokenPayload || !tokenPayload.sub) {
      response.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    const currentUser = await getSingleRow(
      "SELECT * FROM users WHERE user_id = ?",
      [tokenPayload.sub],
    );
    if (!currentUser) {
      response.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    const nextName = String(request.body?.name || "").trim();
    const nextEmail = normalizeEmail(request.body?.email);

    if (!nextName || nextName.length < 2) {
      response.status(400).json({
        success: false,
        error: "Name must be at least 2 characters",
      });
      return;
    }

    if (!isValidEmail(nextEmail)) {
      response.status(400).json({
        success: false,
        error: "A valid email is required",
      });
      return;
    }

    const duplicateUser = await getSingleRow(
      "SELECT user_id FROM users WHERE email = ? AND user_id != ? LIMIT 1",
      [nextEmail, currentUser.user_id],
    );
    if (duplicateUser) {
      response.status(409).json({
        success: false,
        error: "Email is already in use",
      });
      return;
    }

    await runQuery(
      "UPDATE users SET name = ?, email = ? WHERE user_id = ?",
      [nextName, nextEmail, currentUser.user_id],
    );

    const updatedUser = await getSingleRow(
      "SELECT * FROM users WHERE user_id = ?",
      [currentUser.user_id],
    );

    response.json({
      success: true,
      data: {
        user: buildPublicUser(updatedUser),
      },
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/auth/logout", (request, response) => {
  const token = extractBearerToken(request);

  if (token) {
    revokedTokens.add(token);
  }

  response.json({
    success: true,
    data: {
      message: "Logged out successfully",
    },
  });
});

// Use the modular routers
app.use(providersEndpoints.router);
app.use(campaignsEndpoints.router);
app.use(donationsEndpoints.router);
app.use(campaignEventsEndpoints.router);
app.use(newslettersEndpoints.router);

const frontendDistPath = path.join(__dirname, "public");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  // Keep API routes above, then serve SPA for all remaining non-API requests.
  app.get(/^\/(?!api).*/, (_request, response) => {
    response.sendFile(frontendIndexPath);
  });
} else {
  console.log("No frontend build found at Backend/public; serving API only.");
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit();
  });
});

module.exports = app;
