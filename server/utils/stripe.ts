// T010: Stripe SDK initialization utility
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export const useStripe = () => {
  if (stripeInstance) {
    return stripeInstance
  }

  const config = useRuntimeConfig()

  if (!config.stripe?.secretKey) {
    throw new Error('Stripe secret key is not configured')
  }

  stripeInstance = new Stripe(config.stripe.secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true
  })

  return stripeInstance
}

export const verifyStripeWebhook = (event: any, signature: string, secret: string) => {
  const stripe = useStripe()

  try {
    return stripe.webhooks.constructEvent(event, signature, secret)
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid signature'
    })
  }
}
