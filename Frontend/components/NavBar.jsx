/*
Oprettet: 18-03-2026
Af: Føen
Beskrivelse: Navigationsbar med links og logo til donationsplatformen
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { resolveLogoImageSource } from "../utils/imagePaths";

function Navbar({ isAuthenticated, authUser, onLogout }) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const navItemStyle = { color: "#001A4D" };
  const displayName = authUser?.name || authUser?.email || "User";
  const avatarLetter = useMemo(() => {
    const source = String(displayName || "U").trim();
    return source.length > 0 ? source.charAt(0).toUpperCase() : "U";
  }, [displayName]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const donateMenuRef = useRef(null);

  async function handleLogoutClick() {
    setIsProfileOpen(false);
    await onLogout();
  }

  function closeMoreMenu() {
    setIsMoreOpen(false);
  }

  function closeDonateMenu() {
    setIsDonateOpen(false);
  }

  useEffect(() => {
    function handleDocumentClick(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }

      if (
        donateMenuRef.current &&
        !donateMenuRef.current.contains(event.target)
      ) {
        setIsDonateOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-links nav-left">
        <Link
          className="nav-action nav-secondary-link"
          to="/search"
          style={navItemStyle}
        >
          Search
        </Link>

        <div className="nav-donate-wrap" ref={donateMenuRef}>
          <button
            className="nav-action nav-donate-toggle"
            type="button"
            onClick={() => setIsDonateOpen((previous) => !previous)}
            aria-expanded={isDonateOpen}
            aria-label="Open donate menu"
          >
            Donate ▾
          </button>

          {isDonateOpen && (
            <div className="nav-donate-menu">
              <Link
                className="nav-action"
                to="/category"
                style={navItemStyle}
                onClick={closeDonateMenu}
              >
                Category
              </Link>
              <Link
                className="nav-action"
                to="/search"
                style={navItemStyle}
                onClick={closeDonateMenu}
              >
                Find campaign
              </Link>
            </div>
          )}
        </div>

        <Link
          className="nav-action nav-secondary-link"
          to="/info"
          style={navItemStyle}
        >
          Info
        </Link>

        <Link className="nav-action" to="/" style={navItemStyle}>
          Home
        </Link>
      </div>

      <Link className="logo-wrap logo-link" to="/" aria-label="Go to home">
        <h1 className="logo">FundTogether</h1>
        <img
          className="logo-icon"
          src={resolveLogoImageSource("fundtogether-logo.png")}
          alt="FundTogether logo"
        />
      </Link>

      <div className="nav-links nav-right">
        {!isHomePage && (
          <Link
            className="nav-action nav-action-primary nav-right-link"
            to="/create"
            style={navItemStyle}
          >
            Start Campaign
          </Link>
        )}

        {isAuthenticated ? (
          <div className="nav-profile-wrap" ref={profileMenuRef}>
            <button
              className="nav-profile-trigger"
              type="button"
              onClick={() => setIsProfileOpen((previous) => !previous)}
              aria-expanded={isProfileOpen}
              aria-label="Open profile menu"
            >
              <span className="nav-avatar" aria-hidden="true">
                {avatarLetter}
              </span>
              <span className="nav-profile-name" title={displayName}>
                {displayName}
              </span>
              <span className="nav-profile-caret" aria-hidden="true">
                ▾
              </span>
            </button>

            {isProfileOpen && (
              <div className="nav-profile-menu">
                <Link
                  className="nav-action"
                  to="/dashboard"
                  style={navItemStyle}
                  onClick={() => setIsProfileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  className="nav-action"
                  to="/profile"
                  style={navItemStyle}
                  onClick={() => setIsProfileOpen(false)}
                >
                  Profil
                </Link>
                <button
                  className="nav-action"
                  type="button"
                  onClick={handleLogoutClick}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            className="nav-action nav-signin-btn"
            to="/signin"
            style={navItemStyle}
          >
            Sign In
          </Link>
        )}

        <div className="nav-more-wrap">
          <button
            className="nav-action nav-more-toggle"
            type="button"
            onClick={() => setIsMoreOpen((previous) => !previous)}
            aria-expanded={isMoreOpen}
            aria-label="Open more menu"
          >
            More
          </button>

          {isMoreOpen && (
            <div className="nav-more-menu">
              <Link
                className="nav-action"
                to="/category"
                style={navItemStyle}
                onClick={closeMoreMenu}
              >
                Category
              </Link>
              <Link
                className="nav-action"
                to="/info"
                style={navItemStyle}
                onClick={closeMoreMenu}
              >
                Info
              </Link>
              <Link
                className="nav-action"
                to="/create"
                style={navItemStyle}
                onClick={closeMoreMenu}
              >
                Start Campaign
              </Link>
              <Link
                className="nav-action"
                to="/search"
                style={navItemStyle}
                onClick={closeMoreMenu}
              >
                Search
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
