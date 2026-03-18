import React from 'react'
import CampaignCard from '../components/CampaignCard'

function Home () {
  return (
    <div>

      <section className="hero">

        <h1>One platform. Unlimited support</h1>

        <p>
         Where people come together to make a difference
        </p>

      </section>

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
