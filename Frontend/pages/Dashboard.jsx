import React from 'react'

function Dashboard ({ authUser }) {
  return (
    <section className='dashboard-card'>
      <h1>Dashboard</h1>
      <p>You are signed in.</p>

      <div className='dashboard-grid'>
        <article>
          <h3>Profile</h3>
          <p><strong>Name:</strong> {authUser?.name || 'Unknown'}</p>
          <p><strong>Email:</strong> {authUser?.email || 'Unknown'}</p>
          <p><strong>Status:</strong> {authUser?.status || 'Unknown'}</p>
        </article>

        <article>
          <h3>Next Step</h3>
          <p>This page is now route protected. Expand this with user donations next.</p>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
