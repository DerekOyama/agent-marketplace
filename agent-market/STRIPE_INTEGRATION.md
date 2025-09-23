# Stripe Integration Guide

This document explains the Stripe payment integration added to the Agent Marketplace application.

## Features Added

### 1. Stripe API Routes
- **`/api/stripe/status`** - Check Stripe configuration and connection
- **`/api/stripe/test-payment`** - Create test payment intents
- **`/api/stripe/test-webhook`** - Test webhook functionality
- **`/api/stripe/checkout-session`** - Create Stripe checkout sessions
- **`/api/stripe/webhook`** - Handle Stripe webhooks

### 2. Debug UI Components
- **Stripe Test Panel** - Dedicated testing interface with amount/currency controls
- **Debug Buttons** - Quick test buttons in the main debug menu
- **Real-time Results** - JSON response display for all Stripe operations

### 3. Utility Functions
- **Stripe Configuration** - Environment validation and setup
- **Payment Processing** - Helper functions for creating payments
- **Webhook Handling** - Secure webhook signature verification
- **Error Handling** - Comprehensive error management

## Setup Instructions

### 1. Get Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### 2. Configure Environment Variables
Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Set Up Webhooks (Optional)
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
4. Copy the webhook secret to your environment variables

## Usage

### Testing Stripe Integration

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open the Stripe Test Panel**:
   - Click the "Stripe Test" button in the top navigation
   - Configure payment amount and currency
   - Use the test buttons to verify functionality

3. **Use Debug Menu**:
   - Click "Debug" to open the debug menu
   - Use the Stripe testing buttons in the "Stripe Payment Testing" section

### Available Test Functions

#### Stripe Status
- Checks if Stripe is properly configured
- Tests connection to Stripe API
- Returns account information

#### Test Payment
- Creates a test payment intent
- Returns payment details and client secret
- Useful for testing payment flow

#### Test Webhook
- Tests webhook signature verification
- Checks recent Stripe events
- Validates webhook configuration

#### Checkout Session
- Creates a Stripe checkout session
- Opens payment form in new tab
- Handles success/cancel redirects

## API Endpoints

### GET `/api/stripe/status`
Check Stripe configuration and connection status.

**Response**:
```json
{
  "configured": true,
  "environment": {
    "hasSecretKey": true,
    "hasPublishableKey": true,
    "hasWebhookSecret": true
  },
  "stripeInfo": {
    "id": "acct_...",
    "type": "standard",
    "country": "US",
    "chargesEnabled": true
  }
}
```

### POST `/api/stripe/test-payment`
Create a test payment intent.

**Request Body**:
```json
{
  "amountCents": 1000,
  "currency": "usd",
  "description": "Test payment"
}
```

**Response**:
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_...",
    "amount": 1000,
    "currency": "usd",
    "status": "requires_payment_method",
    "clientSecret": "pi_..._secret_..."
  }
}
```

### POST `/api/stripe/checkout-session`
Create a Stripe checkout session.

**Request Body**:
```json
{
  "amountCents": 2000,
  "currency": "usd",
  "description": "Agent Marketplace Credits",
  "successUrl": "http://localhost:3000?payment=success",
  "cancelUrl": "http://localhost:3000?payment=cancelled"
}
```

**Response**:
```json
{
  "success": true,
  "session": {
    "id": "cs_...",
    "url": "https://checkout.stripe.com/pay/cs_...",
    "amountTotal": 2000,
    "currency": "usd"
  }
}
```

## Webhook Events

The webhook handler processes these Stripe events:

- **`payment_intent.succeeded`** - Updates transaction status to completed
- **`payment_intent.payment_failed`** - Updates transaction status to failed
- **`checkout.session.completed`** - Adds credits to user account

## Error Handling

The integration includes comprehensive error handling:

- **Configuration Errors** - Clear messages when Stripe keys are missing
- **API Errors** - Stripe-specific error codes and messages
- **Network Errors** - Connection and timeout handling
- **Validation Errors** - Input validation for amounts and currencies

## Mock Mode

When Stripe is not configured, the system provides mock responses:
- Mock payment intents with test IDs
- Mock checkout sessions with test URLs
- Clear indication that responses are for testing only

## Security Features

- **Webhook Signature Verification** - Ensures webhooks are from Stripe
- **Environment Validation** - Checks for proper API key configuration
- **Error Sanitization** - Prevents sensitive data exposure
- **Input Validation** - Validates all payment parameters

## Testing Checklist

- [ ] Stripe API keys configured
- [ ] Environment variables set
- [ ] Status check returns success
- [ ] Test payment creates intent
- [ ] Checkout session opens payment form
- [ ] Webhook events are processed
- [ ] Error handling works properly
- [ ] Mock mode works without keys

## Troubleshooting

### Common Issues

1. **"Stripe not configured" errors**
   - Check that API keys are set in environment variables
   - Ensure keys don't contain placeholder values

2. **Webhook signature verification failed**
   - Verify webhook secret is correct
   - Check that webhook endpoint URL matches

3. **Payment intent creation fails**
   - Verify account is activated in Stripe
   - Check that charges are enabled

4. **Checkout session doesn't open**
   - Check browser popup blockers
   - Verify success/cancel URLs are accessible

### Debug Steps

1. Use the "Stripe Status" button to check configuration
2. Check browser console for JavaScript errors
3. Check server logs for API errors
4. Verify environment variables are loaded
5. Test with Stripe's test card numbers

## Test Card Numbers

Use these test card numbers for testing:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **Expired card**: `4000 0000 0000 0069`

## Next Steps

1. **Production Setup**: Switch to live API keys for production
2. **Webhook Configuration**: Set up production webhook endpoints
3. **Error Monitoring**: Add error tracking and alerting
4. **Analytics**: Track payment success rates and failures
5. **Security Audit**: Review security implementation

## Support

For issues with the Stripe integration:
1. Check this documentation
2. Review Stripe's [official documentation](https://stripe.com/docs)
3. Check the application logs
4. Test with Stripe's [test mode](https://stripe.com/docs/testing)
