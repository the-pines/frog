import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SCRET_KEY || '';
const STRIPE_API_VERSION = '2025-08-27.basil';

export const STRIPE_WEBHOOK_SECRET_KEY =
  process.env.STRIPE_WEBHOOK_SECRET_KEY || '';

export const STRIPE_HEADERS = {
  'Stripe-Version': STRIPE_API_VERSION,
  'Content-Type': 'application/json',
};

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
});
