import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any,
});

// Map plans to Price IDs
const PRICE_IDS: Record<string, string> = {
  starter: 'price_1TPWCQJq2n16iSORo91dl3VH',
  pro: 'price_1TPWDzJq2n16iSORxWQiY7RN',
  enterprise: 'price_1TPWEkJq2n16iSORKZmEqbc7',
};

/**
 * Create a Stripe Checkout Session
 * POST /billing/create-checkout-session
 */
router.post('/create-checkout-session', authenticate, async (req: any, res) => {
  try {
    const { plan } = req.body;
    const priceId = PRICE_IDS[plan.toLowerCase()];

    if (!priceId) {
      return res.status(400).json({ error: 'Plano inválido ou ID de preço não configurado' });
    }

    const orgId = req.organizationId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?success=false`,
      customer_email: req.user.email,
      client_reference_id: orgId, // CRITICAL: To identify the org in webhook
      metadata: {
        orgId: orgId,
        plan: plan.toLowerCase(),
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Stripe Webhooks
 * POST /billing/webhook
 * NOTE: This route needs raw body to verify signature
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id;
      const plan = session.metadata?.plan || 'starter';

      if (orgId) {
        // Update organization to paid plan
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan: plan,
            // Stripe limits are enforced by middleware, 
            // but we could also update maxLeads here explicitly
          }
        });
        console.log(`[Stripe] Org ${orgId} upgraded to ${plan}`);
      }
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      // Handle cancellation logic (e.g., downgrade to trial or restricted mode)
      break;

    default:
      console.log(`[Stripe] Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
