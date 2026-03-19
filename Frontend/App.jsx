import React, { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Navbar from './components/NavBar'
import Footer from './components/Footer'

import Home from './pages/Home'
import CampaignPage from './pages/CampaignPage'
import CreateCampaign from './pages/CreateCampaign'
import Category from './pages/Category'
import Info from './pages/Info'
import SignIn from './pages/SignIn'
import Search from './pages/Search'
import Dashboard from './pages/Dashboard'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'

function ProtectedRoute ({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to='/signin' replace />
  }

  return children
}

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '')
  const [authUser, setAuthUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    async function fetchCurrentUser () {
      if (!authToken) {
        setAuthUser(null)
        setIsCheckingSession(false)
        return
      }

      try {
        const response = await fetch(`${API_PREFIX}/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        })

        if (!response.ok) {
          throw new Error('Session is invalid')
        }

        const result = await response.json()
        setAuthUser(result?.data?.user || null)
      } catch (_error) {
        localStorage.removeItem('authToken')
        setAuthToken('')
        setAuthUser(null)
      } finally {
        setIsCheckingSession(false)
      }
    }

    fetchCurrentUser()
  }, [authToken])

  const isAuthenticated = Boolean(authToken && authUser)

  const authApi = useMemo(() => ({
    async login (token, user) {
      localStorage.setItem('authToken', token)
      setAuthToken(token)
      setAuthUser(user)
    },
    async logout () {
      const currentToken = localStorage.getItem('authToken') || ''

      if (currentToken) {
        try {
          await fetch(`${API_PREFIX}/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          })
        } catch (_error) {
          // Ignore logout API errors and still clear local session.
        }
      }

      localStorage.removeItem('authToken')
      setAuthToken('')
      setAuthUser(null)
    }
  }), [])

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Navbar isAuthenticated={isAuthenticated} authUser={authUser} onLogout={authApi.logout} />

      <main className='container'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/campaign/:id' element={<CampaignPage />} />
          <Route path='/create' element={<CreateCampaign />} />
          <Route path='/category' element={<Category />} />
          <Route path='/info' element={<Info />} />
          <Route
            path='/signin'
            element={
              <SignIn
                isAuthenticated={isAuthenticated}
                onLogin={authApi.login}
                isCheckingSession={isCheckingSession}
              />
            }
          />
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard authUser={authUser} />
              </ProtectedRoute>
            }
          />
          <Route path='/search' element={<Search />} />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  )
}

export default App
