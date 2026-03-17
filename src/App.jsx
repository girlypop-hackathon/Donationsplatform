import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import Navbar from "./components/Navbar"
import Footer from "./components/Footer"

import Home from "./pages/Home"
import CampaignPage from "./pages/CampaignPage"
import CreateCampaign from "./pages/CreateCampaign"

function App() {
  return (
    <BrowserRouter>

      <Navbar />

      <main className="container">

        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/create" element={<CreateCampaign />} />

        </Routes>

      </main>

      <Footer />

    </BrowserRouter>
  )
}

export default App