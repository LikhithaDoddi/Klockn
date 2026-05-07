// Tickets router — Stripe-powered ticketing with 2% Klockn platform fee
// POST /tickets/checkout/:eventId → create Stripe Checkout session
// GET  /tickets/:eventId          → list ticket sales for an event (organizer only)

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

export const ticketsRouter = Router()

// Create a Stripe Checkout session for an attendee to purchase a ticket
ticketsRouter.post('/checkout/:eventId', async (req, res) => {
  // TODO: fetch event ticket price from DB
  // TODO: create Stripe Checkout session with:
  //   - application_fee_amount = price * 0.02 (Klockn's 2% fee)
  //   - transfer_data.destination = organizer's Stripe Connect account
  // TODO: return session URL for redirect
  res.json({ url: null })
})

// Organizer views ticket sales dashboard for their event
ticketsRouter.get('/:eventId', requireAuth, async (req, res) => {
  // TODO: query ticket_purchases for this event
  // TODO: verify req.user.uid is the event organizer
  res.json({ tickets: [], revenue: 0, platformFee: 0 })
})
