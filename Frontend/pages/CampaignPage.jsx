import React from "react"

function CampaignPage() {

  return (
    <div className="campaign-page">

      <img
        src="https://placehold.co/800x400"
        alt="campaign"
      />

      <h1>Campaign Title</h1>

      <p>
        Full description of the campaign.
      </p>

      <div className="donation-box">

        <h3>Donate</h3>

        <input
          type="number"
          placeholder="Amount"
        />

        <button>
          Donate
        </button>

      </div>

    </div>
  )
}

export default CampaignPage