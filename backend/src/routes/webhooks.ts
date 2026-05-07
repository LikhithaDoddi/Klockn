// Webhooks router — receives events from Stripe
// Must be registered BEFORE express.json() middleware so raw body is preserved for signature verification

import { Router } from 'express'
import express from 'express'

export const webhooksRouter = Router()

// Stripe webhook — raw body required for signature verification
webhooksRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string

    // TODO: stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    // TODO: handle payment_intent.succeeded → mark attendee as ticket_purchased
    // TODO: handle account.updated → update organizer Stripe Connect status

    res.json({ received: true })
  }
)
