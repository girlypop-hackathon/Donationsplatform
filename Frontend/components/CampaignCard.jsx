import React from "react"
import ProgressBar from "./ProgressBar"

function CampaignCard({ image, title, description }) {
  return (
    <div className="card">

      <img
        src={image}
        alt={title}
      />

      <h3>{title}</h3>

      <p>
        {description}
      </p>

      <ProgressBar />

      <p>Raised: --- / Goal: ---</p>

      <button className="donate-btn">View Campaign</button>
    </div>
  )
}

export default CampaignCard
