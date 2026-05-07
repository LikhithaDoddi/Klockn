// Ticket and payment types

export interface TicketPurchase {
  id: string
  eventId: string
  attendeeId: string
  stripeSessionId: string
  amountCents: number
  // 2% of amountCents — retained by Klockn via Stripe Connect
  platformFeeCents: number
  purchasedAt: string
}
