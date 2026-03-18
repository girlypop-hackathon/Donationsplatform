import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'

function CampaignPage () {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [donations, setDonations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCampaignDetails () {
      try {
        setIsLoading(true)
        setError('')

        const [campaignResponse, donationsResponse] = await Promise.all([
          fetch(`${API_PREFIX}/campaigns/${id}`, {
            signal: controller.signal
          }),
          fetch(`${API_PREFIX}/campaigns/${id}/donations`, {
            signal: controller.signal
          })
        ])

        if (!campaignResponse.ok) {
          throw new Error('Could not fetch campaign')
        }

        if (!donationsResponse.ok) {
          throw new Error('Could not fetch donations')
        }

        const campaignResult = await campaignResponse.json()
        const donationsResult = await donationsResponse.json()

        setCampaign(campaignResult.data || null)
        setDonations(donationsResult.data || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to load campaign from the database.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaignDetails()

    return () => {
      controller.abort()
    }
  }, [id])

  const raisedAmount = useMemo(
    () => donations.reduce((sum, donation) => sum + (Number(donation.amount) || 0), 0),
    [donations]
  )

  if (isLoading) {
    return <p>Loading campaign...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  if (!campaign) {
    return <p>Campaign not found.</p>
  }

  const goalAmount = Number(campaign.goal_amount) || 0

  return (
    <div className='campaign-page'>
      <img
        src={campaign.image || 'https://placehold.co/800x400?text=Campaign'}
        alt={campaign.campaign_bio || 'campaign'}
        onError={(event) => {
          event.currentTarget.src = 'https://placehold.co/800x400?text=Campaign'
        }}
      />

      <h1>{`Campaign #${campaign.campaign_id}`}</h1>

      <p>{campaign.body_text || campaign.campaign_bio || 'No description available yet.'}</p>

      <ProgressBar value={raisedAmount} max={goalAmount} />
      <p>{`Raised: ${raisedAmount} / Goal: ${goalAmount}`}</p>

      <div className='donation-box'>
        <h3>Donate</h3>

        <input type='number' placeholder='Amount' />

        <button>Donate</button>
      </div>
    </div>
  )
}

export default CampaignPage
