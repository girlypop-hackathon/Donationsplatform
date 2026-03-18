const sqlite3 = require('sqlite3').verbose()

// Create database connection
const db = new sqlite3.Database('./donations.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    return;
  }
  console.log('Connected to the donations database.')
})

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
  )`)

  // Campaigns table
  db.run(`CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER,
    image TEXT,
    campaign_bio TEXT,
    body_text TEXT,
    goal_amount REAL,
    milestone_1 INTEGER,
    milestone_2 INTEGER,
    milestone_3 INTEGER,
    FOREIGN KEY (provider_id) REFERENCES providers (organization_id)
  )`)

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
    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
  )`)

  // Email templates table
  db.run(`CREATE TABLE IF NOT EXISTS email_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER,
    template_text TEXT
  )`)

  // Campaign events table for tracking sent milestone and close follow-up emails
  db.run(`CREATE TABLE IF NOT EXISTS campaign_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, event_type),
    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
  )`)

  console.log('Tables created or already exist.');

  // Check if data already exists before inserting
  db.get('SELECT COUNT(*) as count FROM providers', [], (err, row) => {
    if (err) {
      console.error('Error checking providers:', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('No data found. Inserting sample data...');
      insertSampleData(db, closeDatabaseConnection);
    } else {
      console.log(`Database already contains ${row.count} providers. No data inserted.`);
      closeDatabaseConnection();
    }
  });
});

function insertSampleData(db, onComplete) {
  // Insert providers
  const providers = [
    {
      name: 'Dyrenes Beskyttelse',
      logo: 'logo1.png',
      bio: 'Dedicated to animal protection in Denmark.',
      website_link: 'https://www.dyrenesbeskyttelse.dk',
      is_organization: true
    },
    {
      name: 'Dyreværnet',
      logo: 'logo2.png',
      bio: 'Working for animal welfare and rights.',
      website_link: 'https://www.dyreværnet.dk',
      is_organization: true
    },
    {
      name: 'OSA',
      logo: 'logo3.png',
      bio: 'Organization for animal shelters.',
      website_link: 'https://www.osa.dk',
      is_organization: true
    },
    {
      name: 'WWF',
      logo: 'logo4.png',
      bio: 'World Wildlife Fund for conservation.',
      website_link: 'https://www.wwf.org',
      is_organization: true
    }
  ]

  const providerStmt = db.prepare(
    'INSERT INTO providers (name, logo, bio, website_link, is_organization) VALUES (?, ?, ?, ?, ?)'
  )
  providers.forEach((provider) => {
    providerStmt.run(
      provider.name,
      provider.logo,
      provider.bio,
      provider.website_link,
      provider.is_organization
    )
  })
  providerStmt.finalize()

  // Insert campaigns
  const campaigns = [
    { provider_id: 1, image: 'campaign1.jpg', campaign_bio: 'Help save abandoned pets.', body_text: 'Detailed description...', goal_amount: 5000, milestone_1: 1000, milestone_2: 2500, milestone_3: 4000 },
    { provider_id: 2, image: 'campaign2.jpg', campaign_bio: 'Support wildlife conservation.', body_text: 'Detailed description...', goal_amount: 10000, milestone_1: 2000, milestone_2: 5000, milestone_3: 8000 },
    { provider_id: 3, image: 'campaign3.jpg', campaign_bio: 'Aid animal shelters.', body_text: 'Detailed description...', goal_amount: 3000, milestone_1: 500, milestone_2: 1500, milestone_3: 2500 },
    { provider_id: 4, image: 'campaign4.jpg', campaign_bio: 'Protect endangered species.', body_text: 'Detailed description...', goal_amount: 15000, milestone_1: 3000, milestone_2: 7500, milestone_3: 12000 }
  ];

  const campaignStmt = db.prepare('INSERT INTO campaigns (provider_id, image, campaign_bio, body_text, goal_amount, milestone_1, milestone_2, milestone_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  campaigns.forEach(campaign => {
    campaignStmt.run(campaign.provider_id, campaign.image, campaign.campaign_bio, campaign.body_text, campaign.goal_amount, campaign.milestone_1, campaign.milestone_2, campaign.milestone_3);
  });
  campaignStmt.finalize();

  // Insert donations
  const donations = [
    {
      campaign_id: 1,
      user_name: 'John Doe',
      email: 'john@example.com',
      account_number: '123456789',
      is_subscription: true,
      amount: 50,
      general_newsletter: true
    },
    {
      campaign_id: 2,
      user_name: 'Jane Smith',
      email: 'jane@example.com',
      account_number: '987654321',
      is_subscription: false,
      amount: 100,
      general_newsletter: false
    },
    {
      campaign_id: 3,
      user_name: 'Bob Johnson',
      email: 'bob@example.com',
      account_number: '456789123',
      is_subscription: true,
      amount: 25,
      general_newsletter: true
    }
  ]

  const donationStmt = db.prepare(
    'INSERT INTO donations (campaign_id, user_name, email, account_number, is_subscription, amount, general_newsletter) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  donations.forEach((donation) => {
    donationStmt.run(
      donation.campaign_id,
      donation.user_name,
      donation.email,
      donation.account_number,
      donation.is_subscription,
      donation.amount,
      donation.general_newsletter
    )
  })
  donationStmt.finalize()

  // Insert email templates
  const emailTemplates = [
    {
      level: 1,
      template_text:
        'Thank you {user_name} for your donation of {amount} to {campaign_name}. Your support helps animals in need.'
    },
    {
      level: 2,
      template_text:
        'Dear {user_name}, we appreciate your generous donation of {amount} to {campaign_name}. You are making a real difference.'
    },
    {
      level: 3,
      template_text:
        'Hello {user_name}, thank you for your substantial contribution of {amount} to {campaign_name}. Your kindness is invaluable.'
    }
  ]

  const templateStmt = db.prepare(
    'INSERT INTO email_templates (level, template_text) VALUES (?, ?)'
  )
  emailTemplates.forEach((template) => {
    templateStmt.run(template.level, template.template_text)
  })
  templateStmt.finalize(() => {
    console.log('Data inserted.')
    onComplete()
  })
}

/**
 * Closes the database connection once setup and optional seed work is finished.
 */
function closeDatabaseConnection() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message)
    } else {
      console.log('Database connection closed.')
    }
  })
}
