/*
Oprettet: 23-03-2026
Oprettet af: Føen og Codex
Beskrivelse: ActivateAccount component. Provides a form for users to set their password and activate their account using a token from the URL. Handles form submission, validation, and displays error messages as needed. On successful activation, logs the user in and redirects to the dashboard.
*/

import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

async function readJsonSafely(response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return {};
  }
}

function ActivateAccount({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => String(searchParams.get("token") || ""),
    [searchParams],
  );

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setErrorMessage("Activation token is missing from the link.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await fetch(`${API_PREFIX}/auth/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          name,
          password,
        }),
      });

      const result = await readJsonSafely(response);
      if (!response.ok || !result?.data?.token || !result?.data?.user) {
        throw new Error(
          result?.error ||
            `Could not activate account (HTTP ${response.status}).`,
        );
      }

      await onLogin(result.data.token, result.data.user);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Could not activate account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <h1>Activate account</h1>
      <p>Set your password to complete account activation.</p>

      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="activate-name">Name (optional)</label>
          <br />
          <input
            id="activate-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </p>

        <p>
          <label htmlFor="activate-password">Password</label>
          <br />
          <input
            id="activate-password"
            type="password"
            minLength="8"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </p>

        <p>
          <label htmlFor="activate-confirm-password">Confirm password</label>
          <br />
          <input
            id="activate-confirm-password"
            type="password"
            minLength="8"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </p>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Activating..." : "Activate account"}
        </button>
      </form>
    </section>
  );
}

export default ActivateAccount;
