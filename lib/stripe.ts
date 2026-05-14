import Stripe from 'stripe'

// Server-side Stripe singleton
// Returns null if STRIPE_SECRET_KEY is not set — safe to call before keys are added
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  })
}
