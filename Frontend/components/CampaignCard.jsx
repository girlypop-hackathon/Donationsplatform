/*
Oprettet: 17-03-2026
Oprettet af: Nikoleta
Beskrivelse: CampaignCard componenter. Displays campaign image, bio, progress bar, and a link to view the campaign details.
Uses a fallback image if no image is provided or if the image fails to load.
*/

import React from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import {
  applyImageFallbackOnce,
  createImagePlaceholderDataUri,
  resolveCampaignImageSource
} from '../utils/imagePaths'

const FALLBACK_IMAGE = resolveCampaignImageSource('', 'fundtogether-logo.png')
const BACKUP_FALLBACK_IMAGE = createImagePlaceholderDataUri('Campaign')

function CampaignCard({ campaign }) {
  if (!campaign) {
    console.log(
      "Campaign data is missing - fun CampaignCard component with no campaign prop",
    );
    return null;
  }

  const goalAmount = Number(campaign.goal_amount) || 0;
  const raisedAmount = Number(campaign.amount_raised) || 0;
  const imageSource = resolveCampaignImageSource(campaign.image, 'fundtogether-logo.png')

  return (
    <div className="card">
      <img
        src={imageSource}
        alt={campaign.campaign_bio || "Animal campaign"}
        onError={(event) => {
          applyImageFallbackOnce(event, FALLBACK_IMAGE, BACKUP_FALLBACK_IMAGE)
        }}
      />

      <h3>{campaign.campaign_bio || `Campaign #${campaign.campaign_id}`}</h3>

      <p className="card-description">
        {campaign.body_text ||
          campaign.campaign_bio ||
          "No campaign description yet."}
      </p>

      {campaign.provider_name && (
        <p className="provider-name">By: {campaign.provider_name}</p>
      )}

      <ProgressBar value={raisedAmount} max={goalAmount} />

      <p className="card-progress-text">{`Raised: ${raisedAmount} / Goal: ${goalAmount}`}</p>

      <Link className="donate-btn" to={`/campaign/${campaign.campaign_id}`}>
        View Campaign
      </Link>
    </div>
  );
}

export default CampaignCard;
