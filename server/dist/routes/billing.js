"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Force V6 Deploy
const stripe_1 = __importDefault(require("stripe"));
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
const stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY)
    : null;
if (!stripe) {
    console.warn('[Stripe] STRIPE_SECRET_KEY is missing. Billing features will be disabled.');
}
// Map plans to Price IDs
const PRICE_IDS = {
    starter: 'price_1TPWCQJq2n16iSORo91dl3VH',
    pro: 'price_1TPWDzJq2n16iSORxWQiY7RN',
    enterprise: 'price_1TPWEkJq2n16iSORKZmEqbc7',
};
/**
 * Create a Stripe Checkout Session
 * POST /billing/create-checkout-session
 */
router.post('/create-checkout-session', auth_1.authenticate, async (req, res) => {
    console.log(`[Stripe] Request from user ${req.user?.id} for org ${req.organizationId}, plan: ${req.body.plan}`);
    if (!stripe) {
        console.error('[Stripe] Client not initialized');
        return res.status(503).json({ error: 'Funcionalidade de pagamento não configurada no servidor.' });
    }
    try {
        const { plan } = req.body;
        if (!plan)
            throw new Error('Plano não especificado');
        const priceId = PRICE_IDS[plan.toLowerCase()];
        if (!priceId) {
            console.error(`[Stripe] Price ID not found for plan: ${plan}`);
            return res.status(400).json({ error: 'Plano inválido ou ID de preço não configurado' });
        }
        const orgId = req.organizationId;
        if (!orgId)
            throw new Error('ID da organização não encontrado no pedido');
        const org = await database_1.prisma.organization.findUnique({ where: { id: orgId } });
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
            success_url: `${process.env.FRONTEND_URL}/app/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/app/settings?success=false`,
            customer_email: req.user.email,
            client_reference_id: orgId, // CRITICAL: To identify the org in webhook
            metadata: {
                orgId: orgId,
                plan: plan.toLowerCase(),
            },
        });
        console.log(`[Stripe] Session created successfully: ${session.url}`);
        res.json({ url: session.url });
    }
    catch (error) {
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
    if (!stripe)
        return res.status(503).send('Stripe not configured');
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const orgId = session.client_reference_id;
            const plan = session.metadata?.plan || 'starter';
            if (orgId) {
                const PLAN_LIMITS = {
                    'starter': 500,
                    'pro': 2000,
                    'enterprise': 10000
                };
                // Update organization to paid plan and set maxLeads
                await database_1.prisma.organization.update({
                    where: { id: orgId },
                    data: {
                        plan: plan,
                        maxLeads: PLAN_LIMITS[plan] || 50,
                    }
                });
                console.log(`[Stripe] Org ${orgId} upgraded to ${plan} (Limit: ${PLAN_LIMITS[plan] || 50})`);
            }
            break;
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            // Handle cancellation logic (e.g., downgrade to trial or restricted mode)
            break;
        default:
            console.log(`[Stripe] Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
});
exports.default = router;
//# sourceMappingURL=billing.js.map