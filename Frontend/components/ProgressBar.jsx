import React from 'react'

function ProgressBar ({ value = 0, max = 100 }) {
  const safeMax = Number(max) > 0 ? Number(max) : 100
  const safeValue = Math.max(0, Number(value) || 0)
  const percentage = Math.min(100, (safeValue / safeMax) * 100)

  return (
    <div className='progress'>
      <div className='progress-bar' style={{ width: `${percentage}%` }} />
    </div>
  )
}

export default ProgressBar
