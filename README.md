# AskOut Web

Anonymous message form for Maxify. Users share their `askout.link/{slug}` and receive anonymous messages, ratings, and more.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Vanilla CSS** — no Tailwind
- **Supabase** — message storage via Edge Function
- **FingerprintJS** — anonymous sender identification

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to Maxify App Store (no slug = no context) |
| `/{slug}` | Anonymous message form for that user |
| `/{slug}?p=...` | Form with custom pre-populated prompt card |
| `/sent` | Confirmation screen after message sent |

## Setup

```bash
npm install
cp .env.example .env.local
# fill in your Supabase URL + keys
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ASKOUT_SUBMIT_URL=https://your-project.supabase.co/functions/v1/submit-signal
```

## How it works

1. Recipient shares their `askout.link/{slug}` link
2. Sender visits the link — fully anonymous, no login required
3. Sender types a message or rates 1–10
4. FingerprintJS captures a device fingerprint (hashed server-side)
5. Payload is POSTed to the Supabase `submit-signal` Edge Function
6. Recipient receives Aura and can spend it to reveal sender info

## Deployment

Deploy to Vercel and point `askout.link` to this project.

```bash
vercel --prod
```
