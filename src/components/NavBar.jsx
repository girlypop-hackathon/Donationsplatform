import React from "react"
import { Link } from "react-router-dom"

function Navbar() {

  return (
    <nav className="navbar">

      <h2 className="logo">AnimalFund</h2>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/create">Start Campaign</Link>
      </div>

    </nav>
  )
}

export default Navbar