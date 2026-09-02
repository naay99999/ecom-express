import Stripe from 'stripe';
import env from './env.js';

/**
 * Null when STRIPE_SECRET_KEY is unset (COD-only/test environments boot
 * fine without it). Payment/webhook code must check for null and throw a
 * clear error rather than let a Stripe SDK call fail on an undefined client.
 */
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export default stripe;
