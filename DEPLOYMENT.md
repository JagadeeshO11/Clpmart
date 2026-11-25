# Deployment guide

## API on Render
1. Create a MongoDB Atlas database and copy its connection string.
2. In Render, create a Blueprint from this repository and select `render.yaml`.
3. Set `MONGODB_URI`, `CLIENT_ORIGINS` (your Vercel web URL), `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Wait for `/api/health` to return `{"ok":true}`.

## Web on Vercel
1. Import this repository into Vercel.
2. Set Root Directory to `apps/web`.
3. Framework preset: Vite. Build command: `npm run build`; output directory: `dist`.
4. Set `VITE_API_URL` to the Render API URL plus `/api`.

## Android
1. Set `EXPO_PUBLIC_API_URL` to the Render API URL plus `/api`.
2. In `apps/mobile`, run `npm install` and `npx expo start`.
3. For a signed installable Android build, configure EAS Build and run `eas build --platform android`.

## First admin
The API creates the first admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when it connects to an empty user collection. Use a strong unique password and rotate it after initial setup.

## Production checklist
- Restrict CORS to exact production origins.
- Use HTTPS and a strong JWT secret.
- Add verified payment-provider order creation and webhook signature validation before collecting money.
- Add transactional stock reservation and order status workflows before high-volume sales.
- Add email/SMS verification, password reset, seller KYC/tax details, shipping integration, privacy/terms and backups.
