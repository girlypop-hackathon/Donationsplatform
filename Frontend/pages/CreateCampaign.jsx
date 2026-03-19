import React from 'react'

function CreateCampaign () {
  return (
    <div className='form-page'>
      <h1>Create Campaign</h1>

      <form className='campaign-form'>
        <input type='text' placeholder='Campaign title' />

        <textarea placeholder='Description' />

        <input type='number' placeholder='Goal amount' />

        <input type='date' />

        <button>Create Campaign</button>
      </form>
    </div>
  )
}

export default CreateCampaign
