import React, { useEffect, useState } from 'react'
import CampaignCard from '../components/CampaignCard'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'

function Home () {
  const [campaigns, setCampaigns] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true)
  const [campaignError, setCampaignError] = useState('')
  const [organizationError, setOrganizationError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCampaigns () {
      try {
        setIsLoadingCampaigns(true)
        setCampaignError('')

        const response = await fetch(`${API_PREFIX}/campaigns`, {
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error('Could not fetch campaigns')
        }

        const result = await response.json()
        setCampaigns(result.data || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCampaignError('Failed to load campaigns from the database.')
        }
      } finally {
        setIsLoadingCampaigns(false)
      }
    }

    async function fetchOrganizations () {
      try {
        setIsLoadingOrganizations(true)
        setOrganizationError('')

        const response = await fetch(`${API_PREFIX}/providers`, {
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error('Could not fetch organizations')
        }

        const result = await response.json()
        setOrganizations(result.data || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setOrganizationError('Failed to load organizations from the database.')
        }
      } finally {
        setIsLoadingOrganizations(false)
      }
    }

    fetchCampaigns()
    fetchOrganizations()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <div>

      <section className="hero">

        <h1>One platform. Unlimited support</h1>

        <p>
         Where people come together to make a difference
        </p>

      </section>

      <section className='campaign-grid'>
        {isLoadingCampaigns && <p>Loading campaigns...</p>}
        {campaignError && <p>{campaignError}</p>}
        {!isLoadingCampaigns && !campaignError && campaigns.length === 0 && (
          <p>No campaigns found in the database.</p>
        )}
        {!isLoadingCampaigns &&
          !campaignError &&
          campaigns.map((campaign) => (
            <CampaignCard key={campaign.campaign_id} campaign={campaign} />
          ))}
      </section>

      <section className='organization-section'>
        <h2>Organizations</h2>

        {isLoadingOrganizations && <p>Loading organizations...</p>}
        {organizationError && <p>{organizationError}</p>}
        {!isLoadingOrganizations && !organizationError && organizations.length === 0 && (
          <p>No organizations found in the database.</p>
        )}

        {!isLoadingOrganizations && !organizationError && organizations.length > 0 && (
          <div className='organization-grid'>
            {organizations.map((organization) => (
              <article className='organization-card' key={organization.organization_id}>
                <h3>{organization.name}</h3>
                <p>{organization.bio || 'No organization bio yet.'}</p>
                {organization.website_link && (
                  <a
                    className='organization-link'
                    href={organization.website_link}
                    target='_blank'
                    rel='noreferrer'
                  >
                    Visit website
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      <section className="campaign-grid">

        <CampaignCard 
          image="/images/elderly-couple.jpg"
          title="Support for Elderly Couple"
          description="Help provide care and support for an elderly couple in need."
        />
        <CampaignCard 
          image="/images/animal-rescue.jpg"
          title="Animal Rescue Fund"
          description="Help rescue and care for animals in distress."
        />
        <CampaignCard 
          image="/images/hospital-patient.jpg"
          title="Medical Support Campaign"
          description="Support for a person in hospital needing medical care."
        />

      </section>
    </div>
  )
}

export default Home
