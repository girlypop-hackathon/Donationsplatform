/*
Oprettet: 17-03-2026
Oprettet af: Føen og Codex
Beskrivelse: CreateCampaign page. Provides a form for users to create a new campaign.
*/

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

const CAMPAIGN_CATEGORIES = [
  "Medical Support",
  "Animal Rescue",
  "Family and Elderly Care",
  "Education",
  "Emergency Relief",
  "Environment",
  "Community Projects",
  "Other",
];

function CreateCampaign() {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    creator_name: "",
    creator_email: "",
    provider_id: "",
    provider_name: "",
    use_private_provider: false,
    category: "Medical Support",
    image: "",
    campaign_bio: "",
    body_text: "",
    goal_amount: "",
    amount_raised: 0,
    milestone_1: "25% of goal reached",
    milestone_2: "50% of goal reached",
    milestone_3: "75% of goal reached",
    deadline: "",
  });

  // UI state
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch providers for dropdown
  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch(`${API_PREFIX}/providers`);
        if (!response.ok) {
          throw new Error("Could not fetch providers");
        }
        const result = await response.json();
        setProviders(result.data || []);
      } catch (err) {
        setError("Failed to load providers. You can still create a campaign.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProviders();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.creator_name ||
      !formData.creator_email ||
      !formData.campaign_bio ||
      !formData.goal_amount
    ) {
      setError(
        "Creator name, creator email, provider, campaign bio, and goal amount are required",
      );
      return;
    }

    const hasSelectedExistingProvider =
      Number.isFinite(Number(formData.provider_id)) &&
      Number(formData.provider_id) > 0;
    const hasCustomOrganizationName = Boolean(
      String(formData.provider_name || "").trim(),
    );

    if (!formData.use_private_provider && !hasSelectedExistingProvider && !hasCustomOrganizationName) {
      setError(
        "Choose an existing organization, choose Private, or enter your own organization name.",
      );
      return;
    }

    if (!formData.creator_email.includes("@")) {
      setError("Creator email must be a valid email");
      return;
    }

    if (
      isNaN(parseFloat(formData.goal_amount)) ||
      parseFloat(formData.goal_amount) <= 0
    ) {
      setError("Goal amount must be a positive number");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_PREFIX}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creator_name: formData.creator_name.trim(),
          creator_email: formData.creator_email.trim(),
          provider_id: hasSelectedExistingProvider
            ? parseInt(formData.provider_id)
            : null,
          provider_name: hasCustomOrganizationName
            ? formData.provider_name.trim()
            : null,
          is_private_provider: Boolean(formData.use_private_provider),
          category: formData.category,
          image: formData.image || "https://placehold.co/800x400?text=Campaign",
          campaign_bio: formData.campaign_bio,
          body_text: formData.body_text,
          goal_amount: parseFloat(formData.goal_amount),
          amount_raised: 0,
          milestone_1: formData.milestone_1 || null,
          milestone_2: formData.milestone_2 || null,
          milestone_3: formData.milestone_3 || null,
          deadline: formData.deadline || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create campaign");
      }

      const result = await response.json();
      setSuccess("Campaign created successfully!");

      // Reset form
      setFormData({
        creator_name: "",
        creator_email: "",
        provider_id: "",
        provider_name: "",
        use_private_provider: false,
        category: "Medical Support",
        image: "",
        campaign_bio: "",
        body_text: "",
        goal_amount: "",
        amount_raised: 0,
        milestone_1: "25% of goal reached",
        milestone_2: "50% of goal reached",
        milestone_3: "75% of goal reached",
      });

      // Navigate to the new campaign page after a short delay
      setTimeout(() => {
        navigate(`/campaign/${result.data.campaign_id}`);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <h1>Create a new campaign</h1>
      <p>
        Fill out the form below to create a new fundraising campaign. Make sure
        to provide a compelling title and description to attract donors. You can
        also set funding milestones to keep your supporters engaged as you
        progress towards your goal.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form className="campaign-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="creator_name">Your full name *</label>
          <input
            type="text"
            name="creator_name"
            id="creator_name"
            placeholder="Enter your full name"
            value={formData.creator_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="creator_email">Your email *</label>
          <input
            type="email"
            name="creator_email"
            id="creator_email"
            placeholder="name@example.com"
            value={formData.creator_email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="provider_id">Choose organization or private *</label>
          {isLoading ? (
            <select name="provider_id" id="provider_id" disabled>
              <option value="">Loading providers...</option>
            </select>
          ) : (
            <select
              name="provider_id"
              id="provider_id"
              value={formData.provider_id}
              onChange={(event) => {
                const nextProviderValue = event.target.value;
                if (nextProviderValue === "private") {
                  setFormData((prev) => ({
                    ...prev,
                    provider_id: "",
                    use_private_provider: true,
                  }));
                  return;
                }

                setFormData((prev) => ({
                  ...prev,
                  provider_id: nextProviderValue,
                  use_private_provider: false,
                }));
              }}
            >
              <option value="">Select a provider</option>
              <option value="private">Private</option>
              {providers.map((provider) => (
                <option
                  key={provider.organization_id}
                  value={provider.organization_id}
                >
                  {provider.name}
                </option>
              ))}
            </select>
          )}

          <label htmlFor="provider_name">Or write your own organization</label>
          <input
            type="text"
            name="provider_name"
            id="provider_name"
            placeholder="Enter organization name"
            value={formData.provider_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            name="category"
            id="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            {CAMPAIGN_CATEGORIES.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="campaign_bio">Campaign title *</label>
          <input
            type="text"
            name="campaign_bio"
            id="campaign_bio"
            placeholder="Enter campaign title"
            value={formData.campaign_bio}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="body_text">Campaign description</label>
          <textarea
            name="body_text"
            id="body_text"
            placeholder="Enter description of your campaign..."
            value={formData.body_text}
            onChange={handleChange}
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Insert campaign image via URL</label>
          <input
            type="url"
            name="image"
            id="image"
            placeholder="https://example.com/image.jpg"
            value={formData.image}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="goal_amount">Funding goal (DKK) *</label>
          <input
            type="number"
            name="goal_amount"
            id="goal_amount"
            placeholder="Enter target amount"
            value={formData.goal_amount}
            onChange={handleChange}
            min="1"
            step="1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="deadline">Campaign deadline (optional)</label>
          <input
            type="date"
            name="deadline"
            id="deadline"
            value={formData.deadline}
            onChange={handleChange}
          />
        </div>

        <div className="milestones-section">
          <h3>Funding Milestones</h3>
          <p>
            Define milestones to motivate donors and show progress. These are
            optional but can help increase engagement. Your subscribing donaters
            will be notified when these milestones are reached.
          </p>

          <div className="form-group">
            <label htmlFor="milestone_1">Milestone 1</label>
            <input
              type="text"
              name="milestone_1"
              id="milestone_1"
              placeholder='25% milestone - e.g., "Initial funding secured"'
              value={formData.milestone_1}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="milestone_2">Milestone 2 </label>
            <input
              type="text"
              name="milestone_2"
              id="milestone_2"
              placeholder='50% milestone - e.g., "Halfway to our goal!"'
              value={formData.milestone_2}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="milestone_3">Milestone 3 </label>
            <input
              type="text"
              name="milestone_3"
              id="milestone_3"
              placeholder='75% milestone - e.g., "Almost there! Final push needed"'
              value={formData.milestone_3}
              onChange={handleChange}
            />
          </div>
        </div>

        <button type="submit" className="create-button" disabled={isSubmitting}>
          {isSubmitting ? "Creating Campaign..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}

export default CreateCampaign;
