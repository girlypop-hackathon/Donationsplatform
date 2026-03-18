import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar from "./components/NavBar"
import Footer from "./components/Footer"

import Home from "./pages/Home"
import CampaignPage from "./pages/CampaignPage"
import CreateCampaign from "./pages/CreateCampaign"
import Category from "./pages/Category"
import Info from "./pages/Info"
import SignIn from "./pages/SignIn"
import Search from "./pages/Search"

function App () {
  return (
    <BrowserRouter>
      <Navbar />

      <main className='container'>
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/create" element={<CreateCampaign />} />
          <Route path="/category" element={<Category />} />
          <Route path="/info" element={<Info />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/search" element={<Search />} />

        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  )
}

export default App
