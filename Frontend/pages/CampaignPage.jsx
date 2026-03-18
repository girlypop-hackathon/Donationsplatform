import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'
const PRESET_AMOUNTS = [50, 100, 250, 500]

const API_BASE_URL = 'http://localhost:3000/api'

/**
 * Loads campaigns and handles donation submissions with newsletter/update opt-ins.
 */
function CampaignPage () {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [donationAmount, setDonationAmount] = useState('')
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [campaignUpdatesOptIn, setCampaignUpdatesOptIn] = useState(false)
  const [submitStatusMessage, setSubmitStatusMessage] = useState('')
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false)

  /**
   * Fetches campaigns once so the donor can target the right campaign.
   */
  useEffect(() => {
    async function fetchCampaignList () {
      try {
        const response = await fetch(`${API_BASE_URL}/campaigns`)
        const payload = await response.json()
        const campaignList = Array.isArray(payload.data) ? payload.data : []

        setCampaigns(campaignList)

        if (campaignList.length > 0) {
          setSelectedCampaignId(String(campaignList[0].campaign_id))
        }
      } catch (error) {
        setSubmitStatusMessage('Could not load campaigns from API.')
      }
    }

    fetchCampaignList()
  }, [])

  /**
   * Submits a donation and includes both newsletter and campaign update preferences.
   */
  async function handleDonationSubmit (event) {
    event.preventDefault()
    setIsSubmittingDonation(true)
    setSubmitStatusMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: selectedAmount,
          user_name: 'Anonymous Donor'
        })
      })

      if (!response.ok) {
        throw new Error('Could not create donation')
      }

      const result = await response.json()
      const createdDonation = result.data

      if (createdDonation) {
        setDonations((previous) => [...previous, createdDonation])
        const updatedAmountRaisedFromApi = Number(createdDonation.amount_raised)

        // Keep progress moving even if backend does not yet return amount_raised
        setCampaign((prevCampaign) => ({
          ...prevCampaign,
          amount_raised: Number.isFinite(updatedAmountRaisedFromApi)
            ? updatedAmountRaisedFromApi
            : (Number(prevCampaign?.amount_raised) || donationsSum) + selectedAmount
        }))
      }

      setDonationStatus('Thank you! Your donation was registered.')
      setCustomAmount('')
      setSelectedPreset(null)
    } catch (err) {
      setDonationStatus('Donation failed. Please try again.')
    } finally {
      setIsSubmittingDonation(false)
    }
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
      <h1>Support a Campaign</h1>

      <p>Donate and choose if you want newsletters and campaign follow-up updates.</p>

      <div className='donation-box'>
        <h3>Donate</h3>

        <form onSubmit={handleDonationSubmit}>
          <label htmlFor='campaign-select'>Campaign</label>
          <select
            id='campaign-select'
            value={selectedCampaignId}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            required
          >
            {campaigns.map((campaign) => (
              <option key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.campaign_bio}
              </option>
            ))}
          </select>

          <label htmlFor='donor-name'>Your name</label>
          <input
            id='donor-name'
            type='text'
            placeholder='Jane Doe'
            value={donorName}
            onChange={(event) => setDonorName(event.target.value)}
            required
          />

          <label htmlFor='donor-email'>Email</label>
          <input
            id='donor-email'
            type='email'
            placeholder='jane@example.com'
            value={donorEmail}
            onChange={(event) => setDonorEmail(event.target.value)}
            required
          />

          <label htmlFor='account-number'>Account number (optional)</label>
          <input
            id='account-number'
            type='text'
            placeholder='123456789'
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
          />

          <label htmlFor='donation-amount'>Amount (DKK)</label>
          <input
            id='donation-amount'
            type='number'
            placeholder='200'
            value={donationAmount}
            onChange={(event) => setDonationAmount(event.target.value)}
            min='1'
            required
          />

          <label htmlFor='campaign-updates-opt-in'>
            <input
              id='campaign-updates-opt-in'
              type='checkbox'
              checked={campaignUpdatesOptIn}
              onChange={(event) => setCampaignUpdatesOptIn(event.target.checked)}
            />
            I want campaign milestone and close updates
          </label>

          <label htmlFor='newsletter-opt-in'>
            <input
              id='newsletter-opt-in'
              type='checkbox'
              checked={newsletterOptIn}
              onChange={(event) => setNewsletterOptIn(event.target.checked)}
            />
            I want general newsletters
          </label>

          <button type='submit' disabled={isSubmittingDonation}>
            {isSubmittingDonation ? 'Sending...' : 'Donate'}
          </button>
        </form>

        {submitStatusMessage ? <p>{submitStatusMessage}</p> : null}
      </div>
    </div>
  )
}

export default CampaignPage
