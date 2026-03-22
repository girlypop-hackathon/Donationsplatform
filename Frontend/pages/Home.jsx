/*
Oprettet: 17-03-2026
Af: Nikoleta
Beskrivelse: Home page component for the donation platform. Displays grid of campaigns, and a list of organizations. Fetches data from the API and handles loading and error states.
*/

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "../components/CampaignCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

// Linea og Mistral Vibe
// Helper function to truncate description to first 20 words
// Beskrivelserne på forsiden skal ikke skrives fuldt ud - de er for lange til at vise
function truncateDescription(text, wordLimit = 20) {
  if (!text) return "";
  const words = text.split(/\s+/); // Split by whitespace
  if (words.length <= wordLimit) return text;
  return words.slice(0, wordLimit).join(" ") + "...";
}

// Hardcodede campagner der vises hvis API ikke henter noget
const FALLBACK_CAMPAIGNS = [
  {
    campaign_id: "demo-1",
    image: "public/images/elderly-couple.jpg",
    campaign_bio:
      "Help provide care and support for an elderly couple in need.",
    amount_raised: 1200,
    goal_amount: 5000,
  },
  {
    campaign_id: "demo-2",
    image: "public/images/animal-rescue.jpg",
    campaign_bio: "Help rescue and care for animals in distress.",
    amount_raised: 900,
    goal_amount: 3500,
  },
  {
    campaign_id: "demo-3",
    image: "public/images/hospital-patient.jpg",
    campaign_bio: "Support for a person in hospital needing medical care.",
    amount_raised: 2100,
    goal_amount: 6000,
  },
];

function Home() {
  const [campaigns, setCampaigns] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [organizationError, setOrganizationError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCampaigns() {
      try {
        setIsLoadingCampaigns(true);
        setCampaignError("");

        const response = await fetch(`${API_PREFIX}/campaigns`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not fetch campaigns");
        }

        const result = await response.json();
        setCampaigns(result.data || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setCampaignError("Failed to load campaigns from the database.");
        }
      } finally {
        setIsLoadingCampaigns(false);
      }
    }

    async function fetchOrganizations() {
      try {
        setIsLoadingOrganizations(true);
        setOrganizationError("");

        const response = await fetch(`${API_PREFIX}/providers`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not fetch organizations");
        }

        const result = await response.json();
        setOrganizations(result.data || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setOrganizationError(
            "Failed to load organizations from the database.",
          );
        }
      } finally {
        setIsLoadingOrganizations(false);
      }
    }

    fetchCampaigns();
    fetchOrganizations();

    return () => {
      controller.abort();
    };
  }, []);

  const shouldUseFallbackCampaigns =
    !isLoadingCampaigns && (campaignError || campaigns.length === 0);

  // Create display versions of campaigns with truncated descriptions
  const campaignsToDisplay = shouldUseFallbackCampaigns
    ? FALLBACK_CAMPAIGNS.map((campaign) => ({
        ...campaign,
        body_text: campaign.campaign_bio, // Use campaign_bio as description for fallback
      }))
    : campaigns.map((campaign) => ({
        ...campaign,
        body_text: truncateDescription(
          campaign.body_text || campaign.campaign_bio || "",
        ),
      }));

  return (
    <div>
      <section className="hero">
        <h1>Where people come together to make a difference</h1>
        <p className="hero-subtitle">One platform. Unlimited support</p>
        <Link className="hero-cta" to="/create">
          Start a Campaign
        </Link>
      </section>

      <section className="campaign-grid">
        {isLoadingCampaigns && <p>Loading campaigns...</p>}
        {campaignError && <p>{campaignError}</p>}
        {shouldUseFallbackCampaigns && (
          <p>Showing demo campaigns while API data is unavailable.</p>
        )}
        {!isLoadingCampaigns &&
          campaignsToDisplay.map((campaign) => (
            <CampaignCard key={campaign.campaign_id} campaign={campaign} />
          ))}
      </section>

      <section className="organization-section">
        <h2>Organizations</h2>

        {isLoadingOrganizations && <p>Loading organizations...</p>}
        {organizationError && <p>{organizationError}</p>}
        {!isLoadingOrganizations &&
          !organizationError &&
          organizations.length === 0 && (
            <p>No organizations found in the database.</p>
          )}

        {!isLoadingOrganizations &&
          !organizationError &&
          organizations.length > 0 && (
            <div className="organization-grid">
              {organizations.map((organization) => (
                <article
                  className="organization-card"
                  key={organization.organization_id}
                >
                  <h3>{organization.name}</h3>
                  <p>{organization.bio || "No organization bio yet."}</p>
                  {organization.website_link && (
                    <a
                      className="organization-link"
                      href={organization.website_link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit website
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

export default Home;
