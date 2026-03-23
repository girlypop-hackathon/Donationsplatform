import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const FALLBACK_IMAGE_URL = "https://placehold.co/800x420?text=Campaign";

function Dashboard({ authUser }) {
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [analytics, setAnalytics] = useState({
    summary: {
      campaignsCount: 0,
      donationsCount: 0,
      totalRaised: 0,
      averageDonation: 0,
    },
    recentDonations: [],
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

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
        setIsLoadingAnalytics(true);
        setCampaignError("");
        setAnalyticsError("");

        const [campaignResponse, analyticsResponse] = await Promise.all([
          fetch(`${API_PREFIX}/users/${userId}/campaigns`),
          fetch(`${API_PREFIX}/users/${userId}/campaigns/analytics`),
        ]);

        const campaignResult = await campaignResponse.json();
        let analyticsResult = {};
        try {
          analyticsResult = await analyticsResponse.json();
        } catch (_error) {
          analyticsResult = {};
        }

        if (!campaignResponse.ok) {
          throw new Error(
            campaignResult?.error || "Could not load your campaigns.",
          );
        }

        setMyCampaigns(
          Array.isArray(campaignResult?.data) ? campaignResult.data : [],
        );

        if (!analyticsResponse.ok) {
          setAnalyticsError(
            analyticsResult?.error || "Could not load analytics data.",
          );
          setAnalytics({
            summary: {
              campaignsCount: 0,
              donationsCount: 0,
              totalRaised: 0,
              averageDonation: 0,
            },
            recentDonations: [],
          });
        } else {
          setAnalytics({
            summary: {
              campaignsCount: Number(
                analyticsResult?.data?.summary?.campaignsCount || 0,
              ),
              donationsCount: Number(
                analyticsResult?.data?.summary?.donationsCount || 0,
              ),
              totalRaised: Number(
                analyticsResult?.data?.summary?.totalRaised || 0,
              ),
              averageDonation: Number(
                analyticsResult?.data?.summary?.averageDonation || 0,
              ),
            },
            recentDonations: Array.isArray(
              analyticsResult?.data?.recentDonations,
            )
              ? analyticsResult.data.recentDonations
              : [],
          });
        }
      } catch (error) {
        const message = error.message || "Could not load your campaigns.";
        setCampaignError(message);
        setMyCampaigns([]);
      } finally {
        setIsLoadingCampaigns(false);
        setIsLoadingAnalytics(false);
      }
    }

    fetchMyCampaigns();
  }, [authUser?.userId]);

  function getProgressPercent(amountRaised, goalAmount) {
    const raised = Number(amountRaised) || 0;
    const goal = Number(goalAmount) || 0;

    if (goal <= 0) return 0;
    return Math.min(100, Math.round((raised / goal) * 100));
  }

  function formatDkk(value) {
    const number = Number(value) || 0;
    return `${number.toLocaleString("da-DK")} DKK`;
  }

  function formatDateTime(value) {
    if (!value) return "Unknown time";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";

    return date.toLocaleString("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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
            <div className="dashboard-campaign-grid">
              {myCampaigns.map((campaign) => {
                const percent = getProgressPercent(
                  campaign.amount_raised,
                  campaign.goal_amount,
                );
                const campaignPath = `/campaign/${campaign.campaign_id}`;

                return (
                  <article
                    key={campaign.campaign_id}
                    className="dashboard-campaign-card"
                  >
                    <Link to={campaignPath} className="dashboard-campaign-image-link">
                      <img
                        src={campaign.image || FALLBACK_IMAGE_URL}
                        alt={campaign.campaign_bio || "Campaign"}
                      />
                    </Link>

                    <div className="dashboard-campaign-body">
                      <h4>
                        <Link to={campaignPath} className="dashboard-campaign-title-link">
                          {campaign.campaign_bio ||
                            `Campaign #${campaign.campaign_id}`}
                        </Link>
                      </h4>

                      <p className="dashboard-campaign-meta">
                        {campaign.provider_name || "Unknown organization"}
                      </p>

                      <ProgressBar
                        value={Number(campaign.amount_raised || 0)}
                        max={Number(campaign.goal_amount || 0)}
                      />

                      <div className="dashboard-campaign-stats">
                        <span>
                          {formatDkk(campaign.amount_raised)} /{" "}
                          {formatDkk(campaign.goal_amount)}
                        </span>
                        <strong>{percent}%</strong>
                      </div>

                      <div className="dashboard-campaign-actions">
                        <Link to={campaignPath} className="dashboard-action-btn">
                          Se kampagne
                        </Link>
                        <Link
                          to={campaignPath}
                          className="dashboard-action-btn dashboard-action-btn-secondary"
                        >
                          Administrer
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article>
          <h3>Analytics</h3>

          {isLoadingAnalytics && <p>Loading analytics...</p>}

          {!isLoadingAnalytics && analyticsError && (
            <p className="auth-error">{analyticsError}</p>
          )}

          {!isLoadingAnalytics && !analyticsError && (
            <>
              <div className="dashboard-analytics-grid">
                <div className="dashboard-analytics-card">
                  <p>Total indsamlet</p>
                  <h4>{formatDkk(analytics.summary.totalRaised)}</h4>
                </div>

                <div className="dashboard-analytics-card">
                  <p>Donationer i alt</p>
                  <h4>{analytics.summary.donationsCount}</h4>
                </div>

                <div className="dashboard-analytics-card">
                  <p>Gennemsnitlig donation</p>
                  <h4>{formatDkk(analytics.summary.averageDonation)}</h4>
                </div>

                <div className="dashboard-analytics-card">
                  <p>Aktive kampagner</p>
                  <h4>{analytics.summary.campaignsCount}</h4>
                </div>
              </div>

              <h4>Seneste donationer</h4>

              {analytics.recentDonations.length === 0 ? (
                <p>Ingen donationer endnu.</p>
              ) : (
                <div className="dashboard-donation-list">
                  {analytics.recentDonations.map((donation) => (
                    <div
                      key={donation.donation_id}
                      className="dashboard-donation-item"
                    >
                      <div>
                        <strong>{formatDkk(donation.amount)}</strong>
                        <p>
                          {donation.user_name || "Anonymous donor"} -{" "}
                          <Link to={`/campaign/${donation.campaign_id}`}>
                            {donation.campaign_bio ||
                              `Campaign #${donation.campaign_id}`}
                          </Link>
                        </p>
                      </div>
                      <span>{formatDateTime(donation.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}

export default Dashboard;
