import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'
const PRESET_AMOUNTS = [50, 100, 250, 500]

function CampaignPage () {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [donations, setDonations] = useState([])
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [customAmount, setCustomAmount] = useState('')
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

  const donationsSum = donations.reduce((sum, donation) => sum + (Number(donation.amount) || 0), 0)
  const parsedAmountRaised = Number(campaign?.amount_raised)
  const raisedAmount = Number.isFinite(parsedAmountRaised) ? parsedAmountRaised : donationsSum

  const selectedAmount = Number(customAmount)
  const hasValidAmount = customAmount !== '' && Number.isFinite(selectedAmount) && selectedAmount > 0

  function handlePresetClick (amount) {
    setSelectedPreset(amount)
    setCustomAmount(String(amount))
  }

  function handleAmountChange (event) {
    const nextValue = event.target.value
    setCustomAmount(nextValue)

    const parsedValue = Number(nextValue)
    if (PRESET_AMOUNTS.includes(parsedValue)) {
      setSelectedPreset(parsedValue)
      return
    }

    setSelectedPreset(null)
  }

  function handleDonate () {
    if (!hasValidAmount) return

    navigate(`/campaign/${id}/payment?amount=${selectedAmount}`, {
      state: {
        amount: selectedAmount
      }
    })
  }

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
        src={campaign.image
          ? campaign.image
          : 'https://placehold.co/800x400?text=Campaign'}
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

        <div className='preset-donations'>
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type='button'
              className={`preset-btn ${selectedPreset === amount ? 'active' : ''}`}
              onClick={() => {
                handlePresetClick(amount)
              }}
            >
              {`${amount} DKK`}
            </button>
          ))}
        </div>

        <input
          type='number'
          placeholder='Or enter your own amount'
          min='1'
          value={customAmount}
          onChange={handleAmountChange}
        />

        {hasValidAmount && <p className='selected-donation'>{`Selected donation: ${selectedAmount} DKK`}</p>}

        <button type='button' disabled={!hasValidAmount} onClick={handleDonate}>
          Continue to payment
        </button>
      </div>
    </div>
  )
}

export default CampaignPage
