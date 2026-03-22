const sqlite3 = require("sqlite3").verbose();

console.log("🧹 Performing complete database cleanup...");

const db = new sqlite3.Database("./donations.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
    return;
  }
  console.log("Connected to the database.");

  startCompleteCleanup(db);
});

function startCompleteCleanup(db) {
  db.serialize(() => {
    console.log("\n=== CURRENT STATE ===");

    // Show current counts
    db.all("SELECT COUNT(*) as count FROM organizations", [], (err, row) => {
      console.log(`Organizations: ${row.count}`);
    });

    db.all("SELECT COUNT(*) as count FROM campaigns", [], (err, row) => {
      console.log(`Campaigns: ${row.count}`);
    });

    db.all("SELECT COUNT(*) as count FROM donations", [], (err, row) => {
      console.log(`Donations: ${row.count}`);
    });

    console.log("\n=== CLEANUP PROCESS ===");

    // Step 1: Clean up duplicate campaigns
    console.log("Cleaning up duplicate campaigns...");

    // For each organization, keep only one campaign with each unique bio
    db.all(
      "SELECT DISTINCT organization_id FROM campaigns",
      [],
      (err, orgs) => {
        if (err) {
          console.error("Error getting organizations:", err.message);
          return;
        }

        orgs.forEach((org) => {
          // For each organization, find campaigns with duplicate bios
          db.all(
            `SELECT campaign_bio, MIN(campaign_id) as keep_id 
                FROM campaigns 
                WHERE organization_id = ? 
                GROUP BY campaign_bio 
                HAVING COUNT(*) > 1`,
            [org.organization_id],
            (err, duplicates) => {
              if (err) {
                console.error(
                  `Error finding duplicate campaigns for org ${org.organization_id}:`,
                  err.message,
                );
                return;
              }

              duplicates.forEach((dup) => {
                // Delete all campaigns with this bio except the one with the minimum ID
                db.run(
                  `DELETE FROM campaigns 
                    WHERE campaign_id != ? 
                    AND campaign_bio = ? 
                    AND organization_id = ?`,
                  [dup.keep_id, dup.campaign_bio, org.organization_id],
                  (err) => {
                    if (err) {
                      console.error(
                        "Error removing duplicate campaign:",
                        err.message,
                      );
                    }
                  },
                );
              });
            },
          );
        });
      },
    );

    // Step 2: Clean up duplicate donations
    console.log("Cleaning up duplicate donations...");

    // Find donations with the same user, campaign, and amount
    db.all(
      `SELECT user_name, campaign_id, amount, MIN(donation_id) as keep_id 
            FROM donations 
            GROUP BY user_name, campaign_id, amount 
            HAVING COUNT(*) > 1`,
      [],
      (err, duplicates) => {
        if (err) {
          console.error("Error finding duplicate donations:", err.message);
          return;
        }

        duplicates.forEach((dup) => {
          // Delete all donations with these characteristics except the one with the minimum ID
          db.run(
            `DELETE FROM donations 
                WHERE donation_id != ? 
                AND user_name = ? 
                AND campaign_id = ? 
                AND amount = ?`,
            [dup.keep_id, dup.user_name, dup.campaign_id, dup.amount],
            (err) => {
              if (err) {
                console.error(
                  "Error removing duplicate donation:",
                  err.message,
                );
              }
            },
          );
        });
      },
    );

    // Step 3: Clean up orphaned records
    console.log("Cleaning up orphaned records...");

    db.run(
      "DELETE FROM donations WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns)",
      [],
      (err) => {
        if (err) {
          console.error("Error cleaning up orphaned donations:", err.message);
        } else console.log("✅ Cleaned up orphaned donations");
      },
    );

    db.run(
      "DELETE FROM campaigns WHERE organization_id NOT IN (SELECT organization_id FROM organizations)",
      [],
      (err) => {
        if (err) {
          console.error("Error cleaning up orphaned campaigns:", err.message);
        } else console.log("✅ Cleaned up orphaned campaigns");
      },
    );

    // Show final state
    setTimeout(() => {
      console.log("\n=== FINAL STATE ===");

      db.all("SELECT COUNT(*) as count FROM organizations", [], (err, row) => {
        console.log(`Organizations: ${row.count}`);
      });

      db.all("SELECT COUNT(*) as count FROM campaigns", [], (err, row) => {
        console.log(`Campaigns: ${row.count}`);
      });

      db.all("SELECT COUNT(*) as count FROM donations", [], (err, row) => {
        console.log(`Donations: ${row.count}`);
      });

      // Show remaining data
      console.log("\n=== REMAINING DATA ===");

      db.all(
        "SELECT * FROM organizations ORDER BY organization_id",
        [],
        (err, rows) => {
          console.log("Organizations:");
          rows.forEach((row) =>
            console.log(`  ${row.organization_id}: ${row.name}`),
          );
        },
      );

      db.all(
        "SELECT * FROM campaigns ORDER BY campaign_id",
        [],
        (err, rows) => {
          console.log("Campaigns:");
          rows.forEach((row) =>
            console.log(
              `  ${row.campaign_id}: ${row.campaign_bio} (Org: ${row.organization_id})`,
            ),
          );
        },
      );

      db.all(
        "SELECT * FROM donations ORDER BY donation_id",
        [],
        (err, rows) => {
          console.log("Donations:");
          rows.forEach((row) =>
            console.log(
              `  ${row.donation_id}: ${row.user_name} -> Campaign ${row.campaign_id} (${row.amount})`,
            ),
          );
        },
      );

      console.log("\n🎉 Complete cleanup finished!");
      db.close();
    }, 1000);
  });
}
