# Craftycorners AI Store (starter)
A responsive Next.js storefront prototype with category filters, search, cart state, and a demo AI chat panel.

## Run locally
1. Install Node.js 20+
2. In this folder run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000

## Prototype notes
- Product data is currently sample data in `app/page.tsx`.
- Cart is client-side only; it does not persist or create orders yet.
- Crafty AI is a UI preview, not connected to an OpenAI API.
- Checkout is a placeholder. Next steps: PostgreSQL product/order schema, admin authentication, OpenAI Responses API, Razorpay checkout, shipping integration, deployment.
