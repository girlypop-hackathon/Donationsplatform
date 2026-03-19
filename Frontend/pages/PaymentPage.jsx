import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'

// Creates the initial payment form values, optionally prefilled with a selected amount.
function createInitialPaymentForm (initialAmount) {
  return {
    userName: '',
    email: '',
    accountNumber: '',
    isSubscription: false,
    amount: initialAmount > 0 ? String(initialAmount) : '',
    generalNewsletter: false
  }
}

// Renders the payment page and submits all donation table fields to the backend.
function PaymentPage () {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Resolves the selected amount from route state or query parameter.
  const selectedAmount = useMemo(() => {
    const amountFromState = Number(location.state?.amount)
    if (Number.isFinite(amountFromState) && amountFromState > 0) {
      return amountFromState
    }

    const amountFromQuery = Number(searchParams.get('amount'))
    if (Number.isFinite(amountFromQuery) && amountFromQuery > 0) {
      return amountFromQuery
    }

    return 0
  }, [location.state, searchParams])

  const [paymentForm, setPaymentForm] = useState(() => createInitialPaymentForm(selectedAmount))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const campaignId = Number(id)
  const amountValue = Number(paymentForm.amount)

  // Updates text and number input values in the payment form.
  function handleInputChange (event) {
    const { name, value } = event.target
    setPaymentForm((previousPaymentForm) => ({
      ...previousPaymentForm,
      [name]: value
    }))
  }

  // Updates boolean checkbox values in the payment form.
  function handleCheckboxChange (event) {
    const { name, checked } = event.target
    setPaymentForm((previousPaymentForm) => ({
      ...previousPaymentForm,
      [name]: checked
    }))
  }

  // Validates required payment form fields before submission.
  function validatePaymentForm () {
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return 'Invalid campaign id.'
    }

    if (paymentForm.userName.trim().length < 2) {
      return 'Please enter your name.'
    }

    if (!paymentForm.email.includes('@')) {
      return 'Please enter a valid email.'
    }

    if (paymentForm.accountNumber.trim().length < 3) {
      return 'Please enter a valid account number.'
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return 'Please enter a valid amount.'
    }

    return ''
  }

  // Submits donation data to the campaign donation endpoint.
  async function handleSubmitPayment (event) {
    event.preventDefault()

    const validationError = validatePaymentForm()
    if (validationError) {
      setErrorMessage(validationError)
      setStatusMessage('')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setStatusMessage('')

      const response = await fetch(`${API_PREFIX}/campaigns/${id}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_name: paymentForm.userName.trim(),
          email: paymentForm.email.trim(),
          account_number: paymentForm.accountNumber.trim(),
          is_subscription: paymentForm.isSubscription,
          amount: amountValue,
          general_newsletter: paymentForm.generalNewsletter
        })
      })

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}))
        throw new Error(errorResult.error || 'Could not complete payment.')
      }

      setStatusMessage('Payment completed. Thank you for your donation!')
      setPaymentForm(createInitialPaymentForm(0))

      setTimeout(() => {
        navigate(`/campaign/${id}`)
      }, 1200)
    } catch (error) {
      setErrorMessage(error.message || 'Could not complete payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className='payment-page'>
      <h1>Payment details</h1>
      <p>Fill in all donation details before completing the payment.</p>

      <form className='payment-form' onSubmit={handleSubmitPayment}>
        <label htmlFor='campaignId'>Campaign id</label>
        <input id='campaignId' type='number' value={Number.isFinite(campaignId) ? campaignId : ''} disabled />

        <label htmlFor='userName'>Name</label>
        <input
          id='userName'
          name='userName'
          type='text'
          value={paymentForm.userName}
          onChange={handleInputChange}
          required
        />

        <label htmlFor='email'>Email</label>
        <input
          id='email'
          name='email'
          type='email'
          value={paymentForm.email}
          onChange={handleInputChange}
          required
        />

        <label htmlFor='accountNumber'>Account number</label>
        <input
          id='accountNumber'
          name='accountNumber'
          type='text'
          value={paymentForm.accountNumber}
          onChange={handleInputChange}
          required
        />

        <label htmlFor='amount'>Amount (DKK)</label>
        <input
          id='amount'
          name='amount'
          type='number'
          min='1'
          value={paymentForm.amount}
          onChange={handleInputChange}
          required
        />

        <label className='payment-checkbox'>
          <input
            name='isSubscription'
            type='checkbox'
            checked={paymentForm.isSubscription}
            onChange={handleCheckboxChange}
          />
          Receive campaign updates
        </label>

        <label className='payment-checkbox'>
          <input
            name='generalNewsletter'
            type='checkbox'
            checked={paymentForm.generalNewsletter}
            onChange={handleCheckboxChange}
          />
          Subscribe to newsletter
        </label>

        {errorMessage && <p className='payment-error'>{errorMessage}</p>}
        {statusMessage && <p className='payment-success'>{statusMessage}</p>}

        <div className='payment-actions'>
          <button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Complete payment'}
          </button>
          <Link to={`/campaign/${id}`} className='payment-back-link'>
            Back to campaign
          </Link>
        </div>
      </form>
    </section>
  )
}

export default PaymentPage
