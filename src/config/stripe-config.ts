import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from './constants/envs';

const STRIPE_API_VERSION = '2025-08-27.basil';
export const STRIPE_HEADERS = {
  'Stripe-Version': STRIPE_API_VERSION,
  'Content-Type': 'application/json',
};

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
});
