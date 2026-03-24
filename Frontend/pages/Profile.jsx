/*
Oprettet: 22-03-2026
Oprettet af: Føen og Codex
Beskrivelse: Profile page. Displays user profile information, a form to edit the user's name and email, and handles form submission to update the user's profile via the API. 
Fetches the current user's profile data on component mount and updates the form fields accordingly.
*/

import React, { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

function Profile({ authUser, authToken, onAuthUserUpdated }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setFormData({
      name: authUser?.name || "",
      email: authUser?.email || "",
    });
  }, [authUser]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMessage("Navn skal være mindst 2 tegn.");
      return;
    }

    if (!formData.email.includes("@")) {
      setErrorMessage("Indtast en gyldig e-mail.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`${API_PREFIX}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || "Kunne ikke opdatere profil.");
      }

      const updatedUser = result?.data?.user;
      if (updatedUser && onAuthUserUpdated) {
        onAuthUserUpdated(updatedUser);
      }

      setSuccessMessage("Dine oplysninger er opdateret.");
    } catch (error) {
      setErrorMessage(error.message || "Kunne ikke opdatere profil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="dashboard-card">
      <h1>Profil</h1>
      <p>Her kan du redigere dine brugeroplysninger.</p>

      <form onSubmit={handleSubmit} className="auth-card-form">
        <label htmlFor="profile-name">Navn</label>
        <input
          id="profile-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleInputChange}
          required
        />

        <label htmlFor="profile-email">E-mail</label>
        <input
          id="profile-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />

        <p>
          <strong>Status:</strong> {authUser?.status || "Ukendt"}
        </p>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}
        {successMessage && <p className="auth-success">{successMessage}</p>}

        <button type="submit" disabled={isSaving}>
          {isSaving ? "Gemmer..." : "Gem ændringer"}
        </button>
      </form>
    </section>
  );
}

export default Profile;
