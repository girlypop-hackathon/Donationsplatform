/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: Kampagneside med donationstrin og billedvisning
*/

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import {
  applyImageFallbackOnce,
  createImagePlaceholderDataUri,
  resolveCampaignImageSource,
} from "../utils/imagePaths";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";
const PRESET_AMOUNTS = [50, 100, 250, 500];
const DONATION_FREQUENCIES = {
  ONE_TIME: "one_time",
  MONTHLY: "monthly",
};
const FALLBACK_IMAGE_URL = resolveCampaignImageSource(
  "",
  "fundtogether-logo.png",
);
const BACKUP_FALLBACK_IMAGE_URL = createImagePlaceholderDataUri("Campaign");

function CampaignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [donationFrequency, setDonationFrequency] = useState(
    DONATION_FREQUENCIES.ONE_TIME,
  );
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCampaignDetails() {
      try {
        setIsLoading(true);
        setError("");

        const [campaignResponse, donationsResponse] = await Promise.all([
          fetch(`${API_PREFIX}/campaigns/${id}`, {
            signal: controller.signal,
          }),
          fetch(`${API_PREFIX}/campaigns/${id}/donations`, {
            signal: controller.signal,
          }),
        ]);

        if (!campaignResponse.ok) {
          throw new Error("Could not fetch campaign");
        }

        if (!donationsResponse.ok) {
          throw new Error("Could not fetch donations");
        }

        const campaignResult = await campaignResponse.json();
        const donationsResult = await donationsResponse.json();

        setCampaign(campaignResult.data || null);
        setDonations(donationsResult.data || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Failed to load campaign from the database.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCampaignDetails();

    return () => {
      controller.abort();
    };
  }, [id]);

  const donationsSum = donations.reduce(
    (sum, donation) => sum + (Number(donation.amount) || 0),
    0,
  );
  const parsedAmountRaised = Number(campaign?.amount_raised);
  const raisedAmount = Number.isFinite(parsedAmountRaised)
    ? parsedAmountRaised
    : donationsSum;

  const selectedAmount = Number(customAmount);
  const hasValidAmount =
    customAmount !== "" &&
    Number.isFinite(selectedAmount) &&
    selectedAmount > 0;

  function handlePresetClick(amount) {
    setSelectedPreset(amount);
    setCustomAmount(String(amount));
  }

  function handleAmountChange(event) {
    const nextValue = event.target.value;
    setCustomAmount(nextValue);

    const parsedValue = Number(nextValue);
    if (PRESET_AMOUNTS.includes(parsedValue)) {
      setSelectedPreset(parsedValue);
      return;
    }

    setSelectedPreset(null);
  }

  function handleDonate() {
    if (!hasValidAmount) return;

    navigate(
      `/campaign/${id}/payment?amount=${selectedAmount}&frequency=${donationFrequency}`,
      {
        state: {
          amount: selectedAmount,
          donationFrequency,
        },
      },
    );
  }

  if (isLoading) {
    return <p>Loading campaign...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!campaign) {
    return <p>Campaign not found.</p>;
  }

  const goalAmount = Number(campaign.goal_amount) || 0;

  return (
    <div className="campaign-page">
      <img
        src={resolveCampaignImageSource(
          campaign.image,
          "fundtogether-logo.png",
        )}
        alt={campaign.campaign_bio || "campaign"}
        onError={(event) => {
          applyImageFallbackOnce(
            event,
            FALLBACK_IMAGE_URL,
            BACKUP_FALLBACK_IMAGE_URL,
          );
        }}
      />
      <h1>{`${campaign.campaign_bio}`}</h1>
      {campaign.provider_name && (
        <p className="provider-info">Organized by: {campaign.provider_name}</p>
      )}

      <p>{campaign.body_text || "No description available yet."}</p>

      {campaign.deadline && (
        <p className="campaign-deadline">
          Campaign deadline:{" "}
          {new Date(campaign.deadline).toLocaleDateString("da-DK")}
        </p>
      )}

      <ProgressBar value={raisedAmount} max={goalAmount} />
      <h3>{`Raised: ${raisedAmount} / Goal: ${goalAmount} DKK`}</h3>

      <div className="donation-box">
        <h3>Donate</h3>
        <div
          className="donation-frequency-buttons"
          role="radiogroup"
          aria-label="Payment type"
        >
          <button
            type="button"
            className={`preset-btn donation-type-btn ${donationFrequency === DONATION_FREQUENCIES.ONE_TIME ? "active" : ""}`}
            onClick={() => {
              setDonationFrequency(DONATION_FREQUENCIES.ONE_TIME);
            }}
            aria-pressed={donationFrequency === DONATION_FREQUENCIES.ONE_TIME}
          >
            Engangsbeløb
          </button>
          <button
            type="button"
            className={`preset-btn donation-type-btn ${donationFrequency === DONATION_FREQUENCIES.MONTHLY ? "active" : ""}`}
            onClick={() => {
              setDonationFrequency(DONATION_FREQUENCIES.MONTHLY);
            }}
            aria-pressed={donationFrequency === DONATION_FREQUENCIES.MONTHLY}
          >
            Fast månedligt beløb
          </button>
        </div>

        <div className="preset-donations">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`preset-btn ${selectedPreset === amount ? "active" : ""}`}
              onClick={() => {
                handlePresetClick(amount);
              }}
            >
              {`${amount} DKK`}
            </button>
          ))}
        </div>

        <input
          type="number"
          placeholder="Or enter your own amount"
          min="1"
          value={customAmount}
          onChange={handleAmountChange}
        />

        {hasValidAmount && (
          <p className="selected-donation">{`Selected donation: ${selectedAmount} DKK`}</p>
        )}

        <button
          type="button"
          disabled={!hasValidAmount}
          onClick={handleDonate}
          id="continue-to-payment-btn"
        >
          Continue to payment
        </button>
      </div>
    </div>
  );
}

export default CampaignPage;
