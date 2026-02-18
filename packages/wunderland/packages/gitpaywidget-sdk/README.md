# @gitpaywidget/sdk

TypeScript SDK for integrating GitPayWidget checkout flows into any web application.

---

## Installation

```bash
npm install @gitpaywidget/sdk
# or
pnpm add @gitpaywidget/sdk
```

---

## Usage

### Basic Setup

```typescript
import { initWidget } from '@gitpaywidget/sdk';

initWidget({
  project: 'your-org/your-site',
  plan: 'pro',
  endpoint: 'https://gitpaywidget.com/api', // optional, defaults to production
});
```

This automatically attaches click handlers to all buttons with `data-gpw-project` and `data-gpw-plan` attributes:

```html
<button data-gpw-project="your-org/your-site" data-gpw-plan="pro">Subscribe to Pro</button>
```

---

## API Reference

### `initWidget(options: WidgetOptions): void`

Initialize the GitPayWidget SDK and attach checkout listeners.

#### Parameters

- **`project`** (`string`, required)  
  Your project slug in the format `org/repo` or `username/site`. Must match a project configured in your GitPayWidget dashboard.

- **`plan`** (`string`, optional)  
  Default plan ID to use if button doesn't specify one via `data-gpw-plan`.

- **`endpoint`** (`string`, optional)  
  API base URL. Defaults to `https://gitpaywidget.com/api`. Override for self-hosted instances.

- **`onSuccess`** (`(sessionId: string) => void`, optional)  
  Callback fired when checkout session is created successfully.

- **`onError`** (`(error: Error) => void`, optional)  
  Callback fired if checkout creation fails.

#### Example

```typescript
import { initWidget } from '@gitpaywidget/sdk';

initWidget({
  project: 'acme/landing',
  plan: 'starter',
  onSuccess: sessionId => {
    console.log('Checkout started:', sessionId);
    // Track analytics, show confirmation, etc.
  },
  onError: err => {
    console.error('Checkout failed:', err);
    alert('Unable to start checkout. Please try again.');
  },
});
```

---

## Advanced Usage

### Dynamic Plan Selection

```html
<select id="plan-selector">
  <option value="free">Free</option>
  <option value="pro">Pro ($9.99/mo)</option>
</select>

<button id="checkout-btn">Subscribe</button>

<script type="module">
  import { initWidget } from '@gitpaywidget/sdk';

  const selector = document.getElementById('plan-selector');
  const btn = document.getElementById('checkout-btn');

  btn.addEventListener('click', () => {
    btn.dataset.gpwPlan = selector.value;
  });

  initWidget({ project: 'acme/app' });
</script>
```

### Custom Checkout Flow

```typescript
import { createCheckout } from '@gitpaywidget/sdk';

const checkoutButton = document.querySelector('#custom-checkout');

checkoutButton.addEventListener('click', async () => {
  try {
    const { checkoutUrl, sessionId } = await createCheckout({
      project: 'acme/site',
      plan: 'enterprise',
      metadata: {
        userId: '12345',
        campaign: 'black-friday',
      },
    });

    // Redirect user to hosted checkout
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Checkout failed:', error);
  }
});
```

---

## TypeScript Support

The SDK is written in TypeScript and exports all relevant types:

```typescript
import type { WidgetOptions, CheckoutRequest, CheckoutResponse } from '@gitpaywidget/sdk';
```

---

## Browser Compatibility

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- ES modules required (`type="module"`)
- No IE11 support

---

## Security

- All checkout requests are proxied through `gitpaywidget.com/api`
- Provider secrets never reach the client
- Sessions are cryptographically signed by Stripe/Lemon Squeezy
- HTTPS required in production

---

## Support

Questions or issues? Contact **team@manic.agency** or file an issue at https://github.com/manicinc/gitpaywidget

---

**Built by** Manic Agency LLC
