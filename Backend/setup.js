const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create database connection
const databasePath = path.join(__dirname, "donations.db");
const db = new sqlite3.Database(databasePath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
    return;
  }
  console.log("Connected to the donations database.");
});

// Create tables
db.serialize(() => {
  // Providers table
  db.run(`CREATE TABLE IF NOT EXISTS providers (
    organization_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    bio TEXT,
    website_link TEXT,
    is_organization BOOLEAN
  )`);

  // Campaigns table
  db.run(`CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER,
    image TEXT,
    campaign_bio TEXT,
    body_text TEXT,
    goal_amount REAL,
    amount_raised REAL DEFAULT 0,
    milestone_1 INTEGER,
    milestone_2 INTEGER,
    milestone_3 INTEGER,
    deadline TEXT,
    FOREIGN KEY (provider_id) REFERENCES providers (organization_id)
  )`);

  // Donations table
  db.run(`CREATE TABLE IF NOT EXISTS donations (
    donation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    user_name TEXT,
    email TEXT,
    account_number TEXT,
    is_subscription BOOLEAN,
    amount REAL,
    general_newsletter BOOLEAN,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
  )`);

  // Users table for authentication
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Email templates table
  db.run(`CREATE TABLE IF NOT EXISTS email_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER,
    template_text TEXT
  )`);

  // Campaign events table for tracking sent milestone and close follow-up emails
  db.run(`CREATE TABLE IF NOT EXISTS campaign_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, event_type),
    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
  )`);

  console.log("Tables created or already exist.");

  ensureProviderIdColumn(db, () => {
    ensureAmountRaisedColumn(db, () => {
      // Check if data already exists before inserting
      db.get("SELECT COUNT(*) as count FROM providers", [], (err, result) => {
        if (err) {
          console.error("Error checking providers:", err.message);
          return;
        }

        if (result.count === 0) {
          console.log("No data found. Inserting sample data...");
          insertSampleData(db);
        } else {
          console.log(
            `Database already contains ${result.count} organizations. No data inserted.`,
          );
          closeDatabase();
        }
      });
    });
  });
});

function ensureProviderIdColumn(db, done) {
  db.all("PRAGMA table_info(campaigns)", [], (err, columns) => {
    if (err) {
      console.error(
        "Error reading campaigns schema for provider_id:",
        err.message,
      );
      if (done) done();
      return;
    }

    const hasProviderId = columns.some(
      (column) => column.name === "provider_id",
    );
    const hasOrganizationId = columns.some(
      (column) => column.name === "organization_id",
    );

    if (hasProviderId && hasOrganizationId) {
      db.run(
        "UPDATE campaigns SET provider_id = organization_id WHERE provider_id IS NULL OR provider_id = 0",
        (backfillErr) => {
          if (backfillErr) {
            console.error(
              "Error backfilling provider_id values:",
              backfillErr.message,
            );
          }
          if (done) done();
        },
      );
      return;
    }

    if (hasProviderId) {
      if (done) done();
      return;
    }

    db.run(
      "ALTER TABLE campaigns ADD COLUMN provider_id INTEGER",
      (alterErr) => {
        if (alterErr) {
          console.error("Error adding provider_id column:", alterErr.message);
          if (done) done();
          return;
        }

        if (!hasOrganizationId) {
          if (done) done();
          return;
        }

        db.run(
          "UPDATE campaigns SET provider_id = organization_id",
          (updateErr) => {
            if (updateErr) {
              console.error(
                "Error copying organization_id to provider_id:",
                updateErr.message,
              );
            } else {
              console.log("Added and backfilled provider_id column.");
            }
            if (done) done();
          },
        );
      },
    );
  });
}

function ensureAmountRaisedColumn(db, done) {
  db.all("PRAGMA table_info(campaigns)", [], (err, columns) => {
    if (err) {
      console.error("Error reading campaigns schema:", err.message);
      if (done) done();
      return;
    }

    const hasAmountRaised = columns.some(
      (column) => column.name === "amount_raised",
    );
    if (columns.length === 0) {
      if (done) done();
      return;
    }

    if (hasAmountRaised) {
      if (done) done();
      return;
    }

    db.run(
      "ALTER TABLE campaigns ADD COLUMN amount_raised REAL DEFAULT 0",
      (alterErr) => {
        if (alterErr) {
          console.error("Error adding amount_raised column:", alterErr.message);
          if (done) done();
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
                "Error backfilling amount_raised values:",
                updateErr.message,
              );
              if (done) done();
              return;
            }

            console.log("Added and backfilled amount_raised column.");
            if (done) done();
          },
        );
      },
    );
  });
}

function insertSampleData(db, onComplete) {
  // Insert providers
  const providers = [
    {
      name: "Dyrenes Beskyttelse",
      logo: "logo1.png",
      bio: "Dedicated to animal protection in Denmark",
      website_link: "https://www.dyrenesbeskyttelse.dk",
      is_organization: true,
    },
    {
      name: "Dyreværnet",
      logo: "logo2.png",
      bio: "Working for animal welfare and rights",
      website_link: "https://www.dyreværnet.dk",
      is_organization: true,
    },
    {
      name: "OSA",
      logo: "logo3.png",
      bio: "Organization for animal shelters",
      website_link: "https://www.osa.dk",
      is_organization: true,
    },
    {
      name: "WWF",
      logo: "logo4.png",
      bio: "World Wildlife Fund for conservation",
      website_link: "https://www.wwf.org",
      is_organization: true,
    },
  ];

  const providerStmt = db.prepare(
    "INSERT INTO providers (name, logo, bio, website_link, is_organization) VALUES (?, ?, ?, ?, ?)",
  );
  providers.forEach((provider) => {
    providerStmt.run(
      provider.name,
      provider.logo,
      provider.bio,
      provider.website_link,
      provider.is_organization,
    );
  });
  providerStmt.finalize();

  // Insert campaigns
  // body_text by ChatGPT
  const campaigns = [
    {
      provider_id: 1,
      image:
        "https://blog.gudog.dk/dk/wp-content/uploads/sites/3/2019/10/pets-3715733_1920.jpg",
      campaign_bio: "Help save abandoned pets",
      body_text:
        "Thousands of pets are abandoned every year and left without food, shelter, or care. This campaign focuses on rescuing vulnerable animals and giving them a second chance at life. With your support, we can provide medical treatment, vaccinations, and safe temporary homes while we work to find loving families. We collaborate with local shelters and volunteers who are dedicated to improving animal welfare in our communities. Every contribution helps cover essential costs and ensures that no animal is left behind. Together, we can create a future where every pet is cared for, protected, and given the opportunity to thrive in a safe and loving environment.",
      goal_amount: 5000,
      milestone_1: 1000,
      milestone_2: 2500,
      milestone_3: 4000,
      deadline: "2026-12-31",
    },
    {
      provider_id: 2,
      image:
        "https://animalcharityevaluators.org/wp-content/uploads/2023/07/jaguar-wildlife@2x.jpg",
      campaign_bio: "Support wildlife conservation",
      body_text:
        "Wildlife around the world is under increasing threat due to habitat loss, climate change, and human activity. This campaign is dedicated to protecting natural ecosystems and preserving biodiversity for future generations. Donations will support conservation projects, including habitat restoration, anti-poaching efforts, and research initiatives that help us better understand endangered species. By working with experienced conservation teams on the ground, we ensure that resources are used effectively and responsibly. Your contribution will directly impact the survival of countless species and help maintain the delicate balance of nature. Together, we can protect wildlife and ensure that these incredible animals continue to exist in the wild.",
      goal_amount: 10000,
      milestone_1: 2000,
      milestone_2: 5000,
      milestone_3: 8000,
      deadline: "2026-11-15",
    },
    {
      provider_id: 3,
      image:
        "https://www.shelteranimalscount.org/wp-content/uploads/2022/09/press-mention-downey-patriot-730x500.jpg",
      campaign_bio: "Aid animal shelters",
      body_text:
        "Animal shelters play a crucial role in caring for animals that have been lost, abandoned, or rescued from unsafe conditions. This campaign aims to provide shelters with the resources they need to continue their vital work. Funds will go toward food, medical supplies, facility maintenance, and staffing support. Many shelters operate under limited budgets, making it difficult to meet the growing demand for their services. By contributing, you help ensure that animals receive proper care, attention, and a safe place to stay while waiting for adoption. Together, we can strengthen these shelters and improve the lives of countless animals in need of compassion and protection.",
      goal_amount: 3000,
      milestone_1: 500,
      milestone_2: 1500,
      milestone_3: 2500,
      deadline: "2026-10-31",
    },
    {
      provider_id: 4,
      image:
        "https://cdn.discovermagazine.com/assets/image/46911/red_panda_lead-x.jpg",
      campaign_bio: "Protect endangered species",
      body_text:
        "Many species across the globe are at risk of extinction due to environmental changes and human impact. This campaign is focused on protecting endangered animals by supporting targeted conservation programs. Your donations will help fund habitat preservation, breeding programs, and education initiatives aimed at reducing human-wildlife conflict. We partner with experts and local communities to create sustainable solutions that protect both wildlife and the people who share their environments. Every contribution plays a role in preventing extinction and preserving the planet’s natural heritage. Together, we can take meaningful action to ensure that endangered species are not lost, but instead given a chance to recover and thrive.",
      goal_amount: 15000,
      milestone_1: 3000,
      milestone_2: 7500,
      milestone_3: 12000,
      deadline: "2026-09-30",
    },
  ];

  const campaignStmt = db.prepare(
    "INSERT INTO campaigns (provider_id, image, campaign_bio, body_text, goal_amount, amount_raised, milestone_1, milestone_2, milestone_3, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  campaigns.forEach((campaign) => {
    campaignStmt.run(
      campaign.provider_id,
      campaign.image,
      campaign.campaign_bio,
      campaign.body_text,
      campaign.goal_amount,
      0,
      campaign.milestone_1,
      campaign.milestone_2,
      campaign.milestone_3,
      campaign.deadline,
    );
  });
  campaignStmt.finalize();

  // Insert donations
  const donations = [
    {
      campaign_id: 1,
      user_name: "John Doe",
      email: "john@example.com",
      account_number: "123456789",
      is_subscription: true,
      amount: 50,
      general_newsletter: true,
    },
    {
      campaign_id: 2,
      user_name: "Jane Smith",
      email: "jane@example.com",
      account_number: "987654321",
      is_subscription: false,
      amount: 100,
      general_newsletter: false,
    },
    {
      campaign_id: 3,
      user_name: "Bob Johnson",
      email: "bob@example.com",
      account_number: "456789123",
      is_subscription: true,
      amount: 25,
      general_newsletter: true,
    },
  ];

  const donationStmt = db.prepare(
    "INSERT INTO donations (campaign_id, user_name, email, account_number, is_subscription, amount, general_newsletter) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  donations.forEach((donation) => {
    donationStmt.run(
      donation.campaign_id,
      donation.user_name,
      donation.email,
      donation.account_number,
      donation.is_subscription,
      donation.amount,
      donation.general_newsletter,
    );
  });
  donationStmt.finalize();

  // Insert email templates
  const emailTemplates = [
    {
      level: 1,
      template_text:
        "Thank you {user_name} for your donation of {amount} to {campaign_name}. Your support helps animals in need.",
    },
    {
      level: 2,
      template_text:
        "Dear {user_name}, we appreciate your generous donation of {amount} to {campaign_name}. You are making a real difference.",
    },
    {
      level: 3,
      template_text:
        "Hello {user_name}, thank you for your substantial contribution of {amount} to {campaign_name}. Your kindness is invaluable.",
    },
  ];

  const templateStmt = db.prepare(
    "INSERT INTO email_templates (level, template_text) VALUES (?, ?)",
  );
  emailTemplates.forEach((template) => {
    templateStmt.run(template.level, template.template_text);
  });
  templateStmt.finalize((err) => {
    if (err) {
      console.error("Error finalizing template insert:", err.message);
    } else {
      console.log("Data inserted.");
    }

    closeDatabase();
  });
}

function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });
}
