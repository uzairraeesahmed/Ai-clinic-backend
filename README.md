# Backend API (MongoDB Atlas + Auth)

Node.js + Express backend with MongoDB Atlas, **signup** and **login** routes using JWT.

## Setup

### 1. MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a new cluster (e.g. free M0).
3. Under **Database Access** → Add Database User (username + password).
4. Under **Network Access** → Add IP Address → allow `0.0.0.0/0` for development (or your IP).
5. Click **Connect** on your cluster → **Connect your application** → copy the connection string.

### 2. Install and run

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `MONGODB_URI` – your Atlas connection string (replace `<username>`, `<password>`, `<cluster>`, `<dbname>`).
- `JWT_SECRET` – a long random string for signing tokens.

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

## API

| Method | Route | Body | Description |
|--------|--------|------|-------------|
| POST | `/api/auth/signup` | `{ "email", "password", "name?" }` | Register a new user |
| POST | `/api/auth/login` | `{ "email", "password" }` | Login, returns user + JWT |

### Signup example

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123","name":"Jane"}'
```

### Login example

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

Responses include a `token` in `data.token`; use it in the `Authorization: Bearer <token>` header for protected routes.
