# Clpmart
Multi-vendor marketplace monorepo with a responsive web storefront, Expo Android app and Express/MongoDB API.

## Apps
- `apps/web`: React + Vite storefront and seller console
- `apps/mobile`: Expo / React Native Android app
- `apps/api`: Express REST API, MongoDB models, JWT auth and role-aware routes

## Quick start
1. Copy `apps/api/.env.example` to `apps/api/.env` and set `MONGODB_URI` and `JWT_SECRET`.
2. Install each workspace's dependencies (see each app's README).
3. Start API: `cd apps/api && npm install && npm run dev`
4. Start web: `cd apps/web && npm install && npm run dev`
5. Start Android: `cd apps/mobile && npm install && npx expo start`

The web and mobile apps use `EXPO_PUBLIC_API_URL` / `VITE_API_URL` respectively. The API includes a demo catalog fallback when MongoDB is not configured; persistent accounts, products and orders require MongoDB. Payment is intentionally a safe checkout placeholder until Razorpay credentials and webhook verification are configured.

## Core flows
- Customer: browse/search/filter products, cart, place order, view order history
- Seller: apply for a seller account, create/manage listings, view orders
- Admin: approve seller applications and moderate listings (admin role required)
- API: health, auth, catalog, seller, cart/order and admin endpoints

## Security notes
Set a long random JWT secret, configure CORS for deployed origins, use HTTPS, validate payment webhooks server-side, and never store card data. Seed the first admin account securely by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first API startup.
