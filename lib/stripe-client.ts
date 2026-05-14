import { loadStripe } from '@stripe/stripe-js'

// Singleton — loadStripe must not be called inside a component render
const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
export const stripePromise = key ? loadStripe(key) : null
