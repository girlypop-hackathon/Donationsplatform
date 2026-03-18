import React from "react"
import CampaignCard from "../components/CampaignCard"

function Home() {

  return (
    <div>

      <section className="hero">

        <h1>Help Animals in Need</h1>

        <p>
          Support rescue campaigns for animals.
        </p>

      </section>

      <section className="campaign-grid">

        <CampaignCard />
        <CampaignCard />
        <CampaignCard />

      </section>

    </div>
  )
}

export default Home