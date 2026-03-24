import React, { useEffect, useMemo, useState } from "react";
import CampaignCard from "../components/CampaignCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const DEFAULT_CATEGORIES = [
  "Medical Support",
  "Animal Rescue",
  "Family and Elderly Care",
  "Education",
  "Emergency Relief",
  "Environment",
  "Community Projects",
  "Other",
];

function Category() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
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
          setErrorMessage("Could not load categories and campaigns.");
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

  const availableCategories = useMemo(() => {
    const categoriesFromCampaigns = campaigns
      .map((campaign) => String(campaign.category || "Other").trim() || "Other")
      .filter(Boolean);

    const merged = [
      ...new Set([...DEFAULT_CATEGORIES, ...categoriesFromCampaigns]),
    ];

    return ["All", ...merged];
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (selectedCategory === "All") {
      return campaigns;
    }

    return campaigns.filter(
      (campaign) => (String(campaign.category || "Other").trim() || "Other") === selectedCategory,
    );
  }, [campaigns, selectedCategory]);

  return (
    <section className="category-page">
      <h1>Categories</h1>
      <p>Browse campaigns by category.</p>

      <div className="category-filter-list">
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={`category-filter-btn ${selectedCategory === category ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(category);
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading && <p>Loading campaigns...</p>}
      {!isLoading && errorMessage && <p>{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <p className="category-result-count">
          {`${filteredCampaigns.length} campaign(s) in ${selectedCategory}`}
        </p>
      )}

      {!isLoading && !errorMessage && filteredCampaigns.length === 0 && (
        <p>No campaigns in this category yet.</p>
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

export default Category;
