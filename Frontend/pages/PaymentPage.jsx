/*
Oprettet: 24-03-2026
Af: Jonas og Navn på AI (GPT-5.3-codex)
Beskrivelse: API endpoints for the donation platform
*/

import React, { useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

// Creates the initial payment form values, optionally prefilled with a selected amount.
function createInitialPaymentForm(initialAmount, initialFrequency = 'one_time') {
  const normalizedFrequency = initialFrequency === 'monthly' ? 'monthly' : 'one_time';

  return {
    userName: '',
    email: '',
    accountNumber: '',
    cprNumber: '',
    isAnonymousDonation: false,
    taxDeduction: false,
    cprNumber: '',
    donationFrequency: normalizedFrequency,
    amount: initialAmount > 0 ? String(initialAmount) : "",
    generalNewsletter: false,
  };
}

// Renders the payment page and submits all donation table fields to the backend.
function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Resolves the selected amount from route state or query parameter.
  const selectedAmount = useMemo(() => {
    const amountFromState = Number(location.state?.amount);
    if (Number.isFinite(amountFromState) && amountFromState > 0) {
      return amountFromState;
    }

    const amountFromQuery = Number(searchParams.get("amount"));
    if (Number.isFinite(amountFromQuery) && amountFromQuery > 0) {
      return amountFromQuery;
    }

    return 0;
  }, [location.state, searchParams]);

  const selectedFrequency = useMemo(() => {
    const frequencyFromState = location.state?.donationFrequency;
    if (frequencyFromState === 'monthly' || frequencyFromState === 'one_time') {
      return frequencyFromState;
    }

    const frequencyFromQuery = searchParams.get('frequency');
    if (frequencyFromQuery === 'monthly' || frequencyFromQuery === 'one_time') {
      return frequencyFromQuery;
    }

    return 'one_time';
  }, [location.state, searchParams]);

  const [paymentForm, setPaymentForm] = useState(() =>
    createInitialPaymentForm(selectedAmount, selectedFrequency),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const campaignId = Number(id)
  const amountValue = Number(paymentForm.amount)
  const shouldDisableCredentialFields = paymentForm.isAnonymousDonation

  // Validates that CPR contains exactly 10 digits, ignoring spaces and punctuation.
  function isValidCprNumber(cprNumber) {
    const normalizedCprNumber = String(cprNumber || '').replace(/\D/g, '')
    return normalizedCprNumber.length === 10
  }

  // Updates text and number input values in the payment form.
  function handleInputChange(event) {
    const { name, value } = event.target;
    setPaymentForm((previousPaymentForm) => ({
      ...previousPaymentForm,
      [name]: value,
    }));
  }

  // Updates boolean checkbox values in the payment form.
  function handleCheckboxChange(event) {
    const { name, checked } = event.target;
    setPaymentForm((previousPaymentForm) => ({
      ...previousPaymentForm,
      [name]: checked,
    }));
  }

  // Toggles tax deduction and clears CPR field when tax deduction is disabled.
  function handleTaxDeductionChange(event) {
    const isChecked = event.target.checked;
    setPaymentForm((previousPaymentForm) => ({
      ...previousPaymentForm,
      taxDeduction: isChecked,
      cprNumber: isChecked ? previousPaymentForm.cprNumber : '',
    }));
  }

  // Toggles anonymous donation and clears personal fields when anonymity is enabled.
  function handleAnonymousToggle (event) {
    const isAnonymousDonation = event.target.checked

    setPaymentForm((previousPaymentForm) => ({
      ...previousPaymentForm,
      isAnonymousDonation,
      userName: isAnonymousDonation ? '' : previousPaymentForm.userName,
      email: isAnonymousDonation ? '' : previousPaymentForm.email,
      accountNumber: isAnonymousDonation ? '' : previousPaymentForm.accountNumber,
      cprNumber: isAnonymousDonation ? '' : previousPaymentForm.cprNumber,
      taxDeduction: isAnonymousDonation ? false : previousPaymentForm.taxDeduction,
      cprNumber: isAnonymousDonation ? '' : previousPaymentForm.cprNumber,
      generalNewsletter: isAnonymousDonation ? false : previousPaymentForm.generalNewsletter
    }))
  }

  // Validates required payment form fields before submission.
  function validatePaymentForm() {
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return "Invalid campaign id.";
    }

    if (!paymentForm.isAnonymousDonation) {
      if (paymentForm.userName.trim().length < 2) {
        return 'Please enter your name.'
      }

      if (!paymentForm.email.includes('@')) {
        return 'Please enter a valid email.'
      }

      if (paymentForm.accountNumber.trim().length < 3) {
        return 'Please enter a valid account number.'
      }

      if (paymentForm.taxDeduction && !isValidCprNumber(paymentForm.cprNumber)) {
        return 'Please enter a valid CPR number (10 digits).'
      }
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return "Please enter a valid amount.";
    }

    if (paymentForm.taxDeduction) {
      const normalizedCpr = paymentForm.cprNumber.replace(/\s+/g, '');
      const isValidCpr = /^\d{6}-?\d{4}$/.test(normalizedCpr);

      if (!isValidCpr) {
        return 'Please enter a valid CPR number (DDMMYY-XXXX).';
      }
    }

    return "";
  }

  // Submits donation data to the campaign donation endpoint.
  async function handleSubmitPayment(event) {
    event.preventDefault();

    const validationError = validatePaymentForm();
    if (validationError) {
      setErrorMessage(validationError);
      setStatusMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setStatusMessage("");

      const response = await fetch(`${API_PREFIX}/campaigns/${id}/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_name: paymentForm.isAnonymousDonation ? 'Anonymous' : paymentForm.userName.trim(),
          email: paymentForm.isAnonymousDonation ? 'Anonymous' : paymentForm.email.trim(),
          account_number: paymentForm.isAnonymousDonation ? 'Anonymous' : paymentForm.accountNumber.trim(),
          anonymous_donation: paymentForm.isAnonymousDonation,
          tax_deduction: paymentForm.taxDeduction,
          cpr_number: paymentForm.taxDeduction
            ? paymentForm.cprNumber.replace(/\s+/g, '')
            : null,
          amount: amountValue,
          is_subscription: paymentForm.donationFrequency === 'monthly',
          general_newsletter: paymentForm.generalNewsletter,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.error || "Could not complete payment.");
      }

      setStatusMessage("Payment completed. Thank you for your donation!");
      setPaymentForm(createInitialPaymentForm(0));

      setTimeout(() => {
        navigate(`/campaign/${id}`);
      }, 1200);
    } catch (error) {
      setErrorMessage(error.message || "Could not complete payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="payment-page">
      <h1>Payment details</h1>
      <p>Fill in all donation details before completing the payment.</p>

      <form className="payment-form" onSubmit={handleSubmitPayment}>
        <label htmlFor="campaignId">Campaign id</label>
        <input
          id="campaignId"
          type="number"
          value={Number.isFinite(campaignId) ? campaignId : ""}
          disabled
        />

        <label className='payment-checkbox'>
          <input
            name='isAnonymousDonation'
            type='checkbox'
            checked={paymentForm.isAnonymousDonation}
            onChange={handleAnonymousToggle}
          />
          Make this donation anonymous
        </label>

        <fieldset className="payment-frequency-group payment-frequency-highlight">
          <legend>Choose payment type</legend>
          <p className="payment-frequency-intro">Pick how you want to support this campaign.</p>
          <label className="payment-frequency-option" htmlFor="frequency-one-time">
            <input
              id="frequency-one-time"
              name="donationFrequency"
              type="radio"
              value="one_time"
              checked={paymentForm.donationFrequency === 'one_time'}
              onChange={handleInputChange}
            />
            <span>Single payment</span>
          </label>
          <label className="payment-frequency-option" htmlFor="frequency-monthly">
            <input
              id="frequency-monthly"
              name="donationFrequency"
              type="radio"
              value="monthly"
              checked={paymentForm.donationFrequency === 'monthly'}
              onChange={handleInputChange}
            />
            <span>Monthly fixed payment</span>
          </label>
        </fieldset>

        <label htmlFor='amount'>Amount (DKK)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="1"
          value={paymentForm.amount}
          onChange={handleInputChange}
          required
        />

        <label htmlFor="userName">Name</label>
        <input
          id="userName"
          name="userName"
          type="text"
          value={paymentForm.userName}
          onChange={handleInputChange}
          required={!paymentForm.isAnonymousDonation}
          disabled={shouldDisableCredentialFields}
          className={shouldDisableCredentialFields ? 'payment-input-disabled' : ''}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={paymentForm.email}
          onChange={handleInputChange}
          required={!paymentForm.isAnonymousDonation}
          disabled={shouldDisableCredentialFields}
          className={shouldDisableCredentialFields ? 'payment-input-disabled' : ''}
        />

        <label htmlFor="accountNumber">Account number</label>
        <input
          id="accountNumber"
          name="accountNumber"
          type="text"
          value={paymentForm.accountNumber}
          onChange={handleInputChange}
          required={!paymentForm.isAnonymousDonation}
          disabled={shouldDisableCredentialFields}
          className={shouldDisableCredentialFields ? 'payment-input-disabled' : ''}
        />

        <label className='payment-checkbox'>
          <input
            name='taxDeduction'
            type='checkbox'
            checked={paymentForm.taxDeduction}
            onChange={handleTaxDeductionChange}
            disabled={paymentForm.isAnonymousDonation}
          />
          Tax deduction
        </label>

        {paymentForm.taxDeduction && !paymentForm.isAnonymousDonation && (
          <>
            <label htmlFor="cprNumber">CPR-nummer</label>
            <input
              id="cprNumber"
              name="cprNumber"
              type="text"
              placeholder="DDMMYY-XXXX"
              value={paymentForm.cprNumber}
              onChange={handleInputChange}
              required={paymentForm.taxDeduction}
              inputMode="numeric"
              disabled={shouldDisableCredentialFields}
              className={shouldDisableCredentialFields ? 'payment-input-disabled' : ''}
            />
          </>
        )}

        <label htmlFor='amount'>Amount (DKK)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="1"
          value={paymentForm.amount}
          onChange={handleInputChange}
          required
        />

        <label className="payment-checkbox">
          <input
            name="isSubscription"
            type="checkbox"
            checked={paymentForm.isSubscription}
            onChange={handleCheckboxChange}
            disabled={paymentForm.isAnonymousDonation}
          />
          Receive campaign updates
        </label>

        <label className="payment-checkbox">
          <input
            name="generalNewsletter"
            type="checkbox"
            checked={paymentForm.generalNewsletter}
            onChange={handleCheckboxChange}
            disabled={paymentForm.isAnonymousDonation}
          />
          Subscribe to newsletter
        </label>

        {errorMessage && <p className="payment-error">{errorMessage}</p>}
        {statusMessage && <p className="payment-success">{statusMessage}</p>}

        <div className="payment-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Complete payment"}
          </button>
          <Link to={`/campaign/${id}`} className="payment-back-link">
            Back to campaign
          </Link>
        </div>

        <p className="payment-privacy-note">
          Ved at fortsætte accepterer du vores behandling af personoplysninger.
          Læs mere i vores{' '}
          <Link to="/info#persondata" className="payment-privacy-link">
            persondatapolitik og samtykkeinfo
          </Link>
          .
        </p>
      </form>
    </section>
  );
}

export default PaymentPage;
