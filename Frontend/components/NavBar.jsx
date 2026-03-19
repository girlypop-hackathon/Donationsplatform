import React from 'react'
import { Link } from 'react-router-dom'

<<<<<<< HEAD
function Navbar ({ isAuthenticated, authUser, onLogout }) {
=======
function Navbar () {
>>>>>>> Developer
  const navItemStyle = { color: '#001A4D' }

  async function handleLogoutClick () {
    await onLogout()
  }

  return (
    <nav className='navbar'>
      <div className='nav-links nav-left'>
        <Link className='nav-action' to='/category' style={navItemStyle}>
          Category
        </Link>
        <Link className='nav-action' to='/info' style={navItemStyle}>
          Info
        </Link>
      </div>

      <div className='logo-wrap'>
        <h1 className='logo'>FundTogether</h1>
        <img
          className='logo-icon'
          src='/images/fundtogether-logo.png'
          alt='FundTogether logo'
        />
      </div>

      <div className='nav-links nav-right'>
        <Link className='nav-action' to='/' style={navItemStyle}>
          Home
        </Link>
        <Link className='nav-action' to='/create' style={navItemStyle}>
          Start Campaign
        </Link>

        {isAuthenticated
          ? (
            <>
              <Link className='nav-action' to='/dashboard' style={navItemStyle}>
                Dashboard
              </Link>
              <button className='nav-action' type='button' onClick={handleLogoutClick}>
                Log Out
              </button>
              <span className='nav-user'>{authUser?.name || authUser?.email}</span>
            </>
            )
          : (
            <Link className='nav-action' to='/signin' style={navItemStyle}>
              Sign In
            </Link>
            )}

        <Link className='nav-action' to='/search' style={navItemStyle}>
          Search
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
