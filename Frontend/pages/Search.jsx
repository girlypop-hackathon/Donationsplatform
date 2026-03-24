import React, { useEffect, useMemo, useState } from "react";
import CampaignCard from "../components/CampaignCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

function Search() {
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCampaigns() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(`${API_PREFIX}/campaigns`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not fetch campaigns");
        }

        const result = await response.json();
        setCampaigns(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorMessage("Could not load campaigns right now.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCampaigns();

    return () => {
      controller.abort();
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCampaigns = useMemo(() => {
    if (!normalizedQuery) {
      return campaigns;
    }

    return campaigns.filter((campaign) => {
      const searchableText = [
        campaign.campaign_bio,
        campaign.body_text,
        campaign.provider_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [campaigns, normalizedQuery]);

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <section className="search-page">
      <h1>Search Campaigns</h1>
      <p>Type a keyword to find campaigns.</p>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search by title, description or organization"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <button type="submit">Search</button>
      </form>

      {isLoading && <p>Loading campaigns...</p>}
      {!isLoading && errorMessage && <p>{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <p className="search-result-count">
          {`${filteredCampaigns.length} campaign(s) found`}
        </p>
      )}

      {!isLoading && !errorMessage && filteredCampaigns.length === 0 && (
        <p>No matching campaigns found.</p>
      )}

      {!isLoading && !errorMessage && filteredCampaigns.length > 0 && (
        <div className="campaign-grid">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.campaign_id} campaign={campaign} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Search;
