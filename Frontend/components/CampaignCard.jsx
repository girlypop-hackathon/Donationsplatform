import React from 'react'
import ProgressBar from './ProgressBar'

function CampaignCard () {
  return (
    <div className='card'>
      <img src='https://placehold.co/600x400' alt='Animal campaign' />

      <h3>Campaign Title</h3>

      <p>Short description about helping animals.</p>

      <ProgressBar />

      <p>Raised: --- / Goal: ---</p>

      <button className='donate-btn'>View Campaign</button>
    </div>
  )
}

export default CampaignCard
