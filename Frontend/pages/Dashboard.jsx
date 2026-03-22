import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

function Dashboard({ authUser }) {
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState("");

  useEffect(() => {
    async function fetchMyCampaigns() {
      const userId = Number(authUser?.userId);

      if (!Number.isFinite(userId) || userId <= 0) {
        setMyCampaigns([]);
        setIsLoadingCampaigns(false);
        return;
      }

      try {
        setIsLoadingCampaigns(true);
        setCampaignError("");

        const response = await fetch(`${API_PREFIX}/users/${userId}/campaigns`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Could not load your campaigns.");
        }

        setMyCampaigns(Array.isArray(result?.data) ? result.data : []);
      } catch (error) {
        setCampaignError(error.message || "Could not load your campaigns.");
        setMyCampaigns([]);
      } finally {
        setIsLoadingCampaigns(false);
      }
    }

    fetchMyCampaigns();
  }, [authUser?.userId]);

  return (
    <section className="dashboard-card">
      <h1>Dashboard</h1>
      <p>You are signed in.</p>

      <div className="dashboard-grid">
        <article>
          <h3>Profile</h3>
          <p>
            <strong>Name:</strong> {authUser?.name || "Unknown"}
          </p>
          <p>
            <strong>Email:</strong> {authUser?.email || "Unknown"}
          </p>
          <p>
            <strong>Status:</strong> {authUser?.status || "Unknown"}
          </p>
        </article>

        <article>
          <h3>My campaigns</h3>

          {isLoadingCampaigns && <p>Loading your campaigns...</p>}

          {!isLoadingCampaigns && campaignError && (
            <p className="auth-error">{campaignError}</p>
          )}

          {!isLoadingCampaigns && !campaignError && myCampaigns.length === 0 && (
            <p>You have not created any campaigns yet.</p>
          )}

          {!isLoadingCampaigns && !campaignError && myCampaigns.length > 0 && (
            <ul>
              {myCampaigns.map((campaign) => (
                <li key={campaign.campaign_id}>
                  <Link to={`/campaign/${campaign.campaign_id}`}>
                    {campaign.campaign_bio || `Campaign #${campaign.campaign_id}`}
                  </Link>
                  {" "}
                  ({Number(campaign.amount_raised || 0)} / {Number(campaign.goal_amount || 0)} DKK)
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

export default Dashboard;
