import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

function SignIn({ isAuthenticated, onLogin, isCheckingSession }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [devActivationLink, setDevActivationLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingActivation, setIsRequestingActivation] = useState(false);

  if (!isCheckingSession && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    try {
      setErrorMessage("");
      setInfoMessage("");
      setDevActivationLink("");
      setIsSubmitting(true);

      const response = await fetch(`${API_PREFIX}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.data?.token || !result?.data?.user) {
        throw new Error(result?.error || "Login failed");
      }

      await onLogin(result.data.token, result.data.user);
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error.message || "Could not sign in. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestActivationLink() {
    if (!email || !email.includes("@") || isRequestingActivation) {
      setErrorMessage("Enter a valid email before requesting an activation link.");
      return;
    }

    try {
      setIsRequestingActivation(true);
      setErrorMessage("");
      setInfoMessage("");
      setDevActivationLink("");

      const response = await fetch(`${API_PREFIX}/auth/request-activation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Could not request activation link");
      }

      setInfoMessage(result?.data?.message || "Activation email sent.");
      setDevActivationLink(result?.data?.devActivationLink || "");
    } catch (error) {
      setErrorMessage(error.message || "Could not request activation link.");
    } finally {
      setIsRequestingActivation(false);
    }
  }

  return (
    <section className="auth-card">
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            required
          />
        </p>

        <p>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            placeholder="Password"
            minLength="8"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            required
          />
        </p>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}
        {infoMessage && <p className="auth-success">{infoMessage}</p>}
        {devActivationLink && (
          <p className="auth-success">
            Development activation link: <a href={devActivationLink}>{devActivationLink}</a>
          </p>
        )}

        <button type="submit" disabled={isSubmitting || isCheckingSession}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
        <button
          type="button"
          onClick={handleRequestActivationLink}
          disabled={isRequestingActivation || isCheckingSession}
        >
          {isRequestingActivation
            ? "Sending activation link..."
            : "Send activation link"}
        </button>
      </form>
    </section>
  );
}

export default SignIn;
