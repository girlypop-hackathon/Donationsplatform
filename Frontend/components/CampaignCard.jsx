/*
Oprettet: 18-03-2026
Af: Linea og Mistral Vibe
Beskrivelse: Kortvisning af kampagne med billede, status og link
*/

import React from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { resolveCampaignImageSource } from '../utils/imagePaths'

const FALLBACK_IMAGE = resolveCampaignImageSource('animal-rescue.jpg')

function CampaignCard ({ campaign }) {
  if (!campaign) {
    console.log('Campaign data is missing - fun CampaignCard component with no campaign prop')
    return null
  }

  const goalAmount = Number(campaign.goal_amount) || 0
  const raisedAmount = Number(campaign.amount_raised) || 0

  return (
    <div className='card'>
      <img
        src={resolveCampaignImageSource(campaign.image, 'animal-rescue.jpg')}
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
