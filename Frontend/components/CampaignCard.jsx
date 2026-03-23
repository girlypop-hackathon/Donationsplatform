/*
Oprettet: 17-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: Kortvisning af kampagne med billede, status og link
Beskrivelse: CampaignCard componenter. Displays campaign image, bio, progress bar, and a link to view the campaign details.
Uses a fallback image if no image is provided or if the image fails to load.
*/

import React from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { resolveCampaignImageSource } from '../utils/imagePaths'

const FALLBACK_IMAGE = resolveCampaignImageSource('animal-rescue.jpg')

// Billede der vises hvis der ikke er billede i databasen ELLER hvis vi ikke henter korrekt
const FALLBACK_IMAGE = "https://placehold.co/600x400?text=Campaign";

function CampaignCard({ campaign }) {
  if (!campaign) {
    console.log(
      "Campaign data is missing - fun CampaignCard component with no campaign prop",
    );
    return null;
  }

  const goalAmount = Number(campaign.goal_amount) || 0;
  const raisedAmount = Number(campaign.amount_raised) || 0;

  return (
    <div className="card">
      <img
        src={campaign.image || FALLBACK_IMAGE}
        alt={campaign.campaign_bio || "Animal campaign"}
        onError={(event) => {
          event.currentTarget.src = FALLBACK_IMAGE;
        }}
      />

      <h3>{campaign.campaign_bio || `Campaign #${campaign.campaign_id}`}</h3>

      <p>
        {campaign.body_text ||
          campaign.campaign_bio ||
          "No campaign description yet."}
      </p>

      {campaign.provider_name && (
        <p className="provider-name">By: {campaign.provider_name}</p>
      )}

      <ProgressBar value={raisedAmount} max={goalAmount} />

      <p>{`Raised: ${raisedAmount} / Goal: ${goalAmount}`}</p>

      <Link className="donate-btn" to={`/campaign/${campaign.campaign_id}`}>
        View Campaign
      </Link>
    </div>
  );
}

export default CampaignCard;
