# Clpmart API
Express + MongoDB REST API.

```bash
npm install
cp .env.example .env
npm run dev
```

Health check: `GET /api/health`.

Set `MONGODB_URI` for persistent data. Without a database the API serves a demo product catalogue only; accounts and order placement require MongoDB. The initial admin is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` at first database connection.

Important routes:
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/products`, `GET /api/products/:id`
- `POST /api/seller/apply`
- `GET/POST /api/seller/products`
- `GET /api/seller/orders`
- `POST /api/orders`, `GET /api/orders/mine`
- `GET /api/admin/sellers`, `PATCH /api/admin/sellers/:id`
