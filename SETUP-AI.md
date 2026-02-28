# AI (Google Gemini) setup

The app uses **Google Gemini** for:

- **Symptom checker** (Doctor → AI Assistant)
- **Prescription explanation** (when creating or viewing prescriptions)

## 1. Get an API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create or sign in with a Google account.
3. Click **Create API key** and copy the key.

## 2. Backend `.env`

Add to `backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

Optional — to force a specific model (e.g. if one hits quota):

```env
GEMINI_MODEL=gemini-2.5-flash
```

Other options: `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`. Note: `gemini-pro` and `gemini-1.5-flash` are deprecated and return 404.

Restart the backend. If you see **429 (quota exceeded)** for one model, the code tries others (each model has its own quota). If all fail, wait for your [free-tier quota](https://ai.google.dev/gemini-api/docs/rate-limits) to reset or set `GEMINI_MODEL=gemini-2.5-flash` (or another model) to use that model’s quota. You can also set `GEMINI_MODEL=gemini-pro` to use the legacy model, which often has separate free-tier quota. See [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). If `GEMINI_API_KEY` is missing, AI features still work but return a short “AI temporarily unavailable” message instead of calling the API.
