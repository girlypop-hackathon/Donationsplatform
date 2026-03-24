import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import {
  applyImageFallbackOnce,
  createImagePlaceholderDataUri,
  resolveCampaignImageSource,
} from "../utils/imagePaths";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const FALLBACK_IMAGE_URL = resolveCampaignImageSource(
  "",
  "fundtogether-logo.png",
);
const BACKUP_FALLBACK_IMAGE_URL = createImagePlaceholderDataUri("Campaign");

async function readJsonSafely(response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return {};
  }
}

function Dashboard({ authUser }) {
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [campaignActionError, setCampaignActionError] = useState("");
  const [campaignActionSuccess, setCampaignActionSuccess] = useState("");
  const [campaignBeingEditedId, setCampaignBeingEditedId] = useState(null);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isDeletingCampaignId, setIsDeletingCampaignId] = useState(null);
  const [campaignEditForm, setCampaignEditForm] = useState({
    campaign_bio: "",
    body_text: "",
    image: "",
    goal_amount: "",
    deadline: "",
  });
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
  const [refreshKey, setRefreshKey] = useState(0);

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

        const campaignResult = await readJsonSafely(campaignResponse);
        let analyticsResult = {};
        try {
          analyticsResult = await readJsonSafely(analyticsResponse);
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
  }, [authUser?.userId, refreshKey]);

  function beginCampaignEdit(campaign) {
    setCampaignActionError("");
    setCampaignActionSuccess("");
    setCampaignBeingEditedId(campaign.campaign_id);
    setCampaignEditForm({
      campaign_bio: String(campaign.campaign_bio || ""),
      body_text: String(campaign.body_text || ""),
      image: String(campaign.image || ""),
      goal_amount: String(campaign.goal_amount || ""),
      deadline: String(campaign.deadline || "").slice(0, 10),
    });
  }

  function cancelCampaignEdit() {
    setCampaignBeingEditedId(null);
    setCampaignEditForm({
      campaign_bio: "",
      body_text: "",
      image: "",
      goal_amount: "",
      deadline: "",
    });
  }

  function handleCampaignEditChange(event) {
    const { name, value } = event.target;
    setCampaignEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function saveCampaignEdit(campaignId) {
    const userId = Number(authUser?.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      setCampaignActionError("Could not determine the signed in user.");
      return;
    }

    if (!campaignEditForm.campaign_bio.trim()) {
      setCampaignActionError("Campaign title is required.");
      return;
    }

    const parsedGoalAmount = Number(campaignEditForm.goal_amount);
    if (!Number.isFinite(parsedGoalAmount) || parsedGoalAmount <= 0) {
      setCampaignActionError("Goal amount must be a positive number.");
      return;
    }

    try {
      setIsSavingCampaign(true);
      setCampaignActionError("");
      setCampaignActionSuccess("");

      const response = await fetch(
        `${API_PREFIX}/users/${userId}/campaigns/${campaignId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaign_bio: campaignEditForm.campaign_bio.trim(),
            body_text: campaignEditForm.body_text,
            image: campaignEditForm.image.trim(),
            goal_amount: parsedGoalAmount,
            deadline: campaignEditForm.deadline || null,
          }),
        },
      );

      const result = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(result?.error || "Could not save campaign changes.");
      }

      setCampaignActionSuccess("Campaign updated successfully.");
      cancelCampaignEdit();
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      setCampaignActionError(
        error.message || "Could not save campaign changes.",
      );
    } finally {
      setIsSavingCampaign(false);
    }
  }

  async function deleteCampaign(campaignId) {
    const userId = Number(authUser?.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      setCampaignActionError("Could not determine the signed in user.");
      return;
    }

    const didConfirmDelete = window.confirm(
      "Delete this campaign? This action cannot be undone.",
    );

    if (!didConfirmDelete) {
      return;
    }

    try {
      setIsDeletingCampaignId(campaignId);
      setCampaignActionError("");
      setCampaignActionSuccess("");

      const response = await fetch(
        `${API_PREFIX}/users/${userId}/campaigns/${campaignId}`,
        {
          method: "DELETE",
        },
      );

      const result = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(result?.error || "Could not delete campaign.");
      }

      if (campaignBeingEditedId === campaignId) {
        cancelCampaignEdit();
      }

      setCampaignActionSuccess("Campaign deleted successfully.");
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      setCampaignActionError(error.message || "Could not delete campaign.");
    } finally {
      setIsDeletingCampaignId(null);
    }
  }

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

  function formatDate(value) {
    if (!value) return "No deadline";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No deadline";

    return date.toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
          <div className="dashboard-campaign-heading-row">
            <h3>My campaigns</h3>
            <Link to="/create" className="dashboard-action-btn">
              Opret kampagne
            </Link>
          </div>

          {campaignActionError && <p className="auth-error">{campaignActionError}</p>}
          {campaignActionSuccess && (
            <p className="auth-success">{campaignActionSuccess}</p>
          )}

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
                        src={resolveCampaignImageSource(
                          campaign.image,
                          "fundtogether-logo.png",
                        )}
                        alt={campaign.campaign_bio || "Campaign"}
                        onError={(event) => {
                          applyImageFallbackOnce(
                            event,
                            FALLBACK_IMAGE_URL,
                            BACKUP_FALLBACK_IMAGE_URL,
                          )
                        }}
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

                      {campaign.deadline && (
                        <p className="dashboard-campaign-deadline">
                          Deadline: {formatDate(campaign.deadline)}
                        </p>
                      )}

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
                        <button
                          type="button"
                          className="dashboard-action-btn dashboard-action-btn-secondary"
                          onClick={() => beginCampaignEdit(campaign)}
                        >
                          Rediger
                        </button>
                        <button
                          type="button"
                          className="dashboard-action-btn dashboard-action-btn-danger"
                          disabled={isDeletingCampaignId === campaign.campaign_id}
                          onClick={() => deleteCampaign(campaign.campaign_id)}
                        >
                          {isDeletingCampaignId === campaign.campaign_id
                            ? "Sletter..."
                            : "Slet"}
                        </button>
                      </div>

                      {campaignBeingEditedId === campaign.campaign_id && (
                        <div className="dashboard-edit-panel">
                          <label htmlFor={`edit-title-${campaign.campaign_id}`}>
                            Titel
                          </label>
                          <input
                            id={`edit-title-${campaign.campaign_id}`}
                            name="campaign_bio"
                            type="text"
                            value={campaignEditForm.campaign_bio}
                            onChange={handleCampaignEditChange}
                          />

                          <label htmlFor={`edit-description-${campaign.campaign_id}`}>
                            Beskrivelse
                          </label>
                          <textarea
                            id={`edit-description-${campaign.campaign_id}`}
                            name="body_text"
                            rows={4}
                            value={campaignEditForm.body_text}
                            onChange={handleCampaignEditChange}
                          />

                          <label htmlFor={`edit-goal-${campaign.campaign_id}`}>
                            Goal amount (DKK)
                          </label>
                          <input
                            id={`edit-goal-${campaign.campaign_id}`}
                            name="goal_amount"
                            type="number"
                            min="1"
                            value={campaignEditForm.goal_amount}
                            onChange={handleCampaignEditChange}
                          />

                          <label htmlFor={`edit-image-${campaign.campaign_id}`}>
                            Billede URL
                          </label>
                          <input
                            id={`edit-image-${campaign.campaign_id}`}
                            name="image"
                            type="url"
                            value={campaignEditForm.image}
                            onChange={handleCampaignEditChange}
                          />

                          <label htmlFor={`edit-deadline-${campaign.campaign_id}`}>
                            Deadline
                          </label>
                          <input
                            id={`edit-deadline-${campaign.campaign_id}`}
                            name="deadline"
                            type="date"
                            value={campaignEditForm.deadline}
                            onChange={handleCampaignEditChange}
                          />

                          <div className="dashboard-edit-actions">
                            <button
                              type="button"
                              className="dashboard-action-btn"
                              disabled={isSavingCampaign}
                              onClick={() => saveCampaignEdit(campaign.campaign_id)}
                            >
                              {isSavingCampaign ? "Gemmer..." : "Gem"}
                            </button>
                            <button
                              type="button"
                              className="dashboard-action-btn dashboard-action-btn-secondary"
                              onClick={cancelCampaignEdit}
                            >
                              Annuller
                            </button>
                          </div>
                        </div>
                      )}
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
