import React from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'

const FALLBACK_IMAGE = 'https://placehold.co/600x400?text=Campaign'

function CampaignCard ({ campaign }) {
  if (!campaign) return null

  const goalAmount = Number(campaign.goal_amount) || 0
  const raisedAmount = Number(campaign.milestone_1) || 0

  return (
    <div className='card'>
      <img
        src={campaign.image || FALLBACK_IMAGE}
        alt={campaign.campaign_bio || 'Animal campaign'}
        onError={(event) => {
          event.currentTarget.src = FALLBACK_IMAGE
        }}
      />

      <h3>{`Campaign #${campaign.campaign_id}`}</h3>

      <p>{campaign.campaign_bio || 'No campaign description yet.'}</p>

      <ProgressBar value={raisedAmount} max={goalAmount} />

      <p>{`Raised: ${raisedAmount} / Goal: ${goalAmount}`}</p>

      <Link className='donate-btn' to={`/campaign/${campaign.campaign_id}`}>
        View Campaign
      </Link>
    </div>
  )
}

export default CampaignCard
