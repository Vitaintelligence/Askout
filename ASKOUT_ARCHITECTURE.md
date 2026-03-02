# AskOut Web Application

**AskOut Web** is the anonymous, web-based frontend paired with the Maxify Mobile App. It is designed to capture anonymous messages, ratings, secrets, and more from a user's web audience, scaling across 19 unique prompt types.

## Architecture & Data Flow

1. **The Link**: A Maxify user shares their unique AskOut link (e.g., `https://askout.link/jay/rate`).
2. **The Form (Next.js)**: The sender views a highly stylized, dark-mode form tailored to the specific `slug` param. The Next.js frontend is entirely stateless.
3. **The Fingerprint**: FingerprintJS assigns a unique, anonymous device ID (`visitorId`) to the sender behind the scenes to deter spam without requiring a login.
4. **The Submission**: The frontend POSTs the encrypted payload directly to the Supabase Edge Function `submit-signal`.
5. **The Edge Function**: `submit-signal` hashes the IP address and fingerprint for privacy, then inserts the raw payload into the `askout_signals` PostgreSQL table on Supabase.
6. **The Escalate (Mobile-only)**: The Maxify user then opens their mobile app, views the anonymous signal, and calls the `escalate-signal` Edge Function to spend Aura Points to reveal hints about the sender's device or identity.

## Tech Stack
* **Framework**: Next.js 15 (App Router, Server Components)
* **Language**: TypeScript
* **Styling**: Vanilla CSS (CSS Variables, keyframe animations, mobile-first design)
* **Identify**: `@fingerprintjs/fingerprintjs`
* **Database**: Supabase / PostgreSQL (via Edge Functions to bypass Row Level Security)

## Dynamic Routing (`/[username]/[slug]`)

The form is highly dynamic and powered by a 19-slug configuration map (`SLUG_CONFIGS`):

*   **Custom Prompts**: Matches the specific slug (e.g. `/jay/truth` -> "Tell me the truth.").
*   **Dynamic UIs**:
    *   `text` (e.g., `/vibe`): Standard `<textarea>` for text input.
    *   `rating` (e.g., `/rate`): Replaces the text box with large 1-10 selector chips.
    *   `askout` (e.g., `/askout`): Replaces the text box with High-Tension Yes/No toggles.
    *   `audio` / `image`: Renders a media stub placeholder for future voice notes and photo uploads.
*   **CSS Accents**: Injects inline CSS Variables (`--theme-accent`) to dynamically flip border colors, submit button colors, glowing drop shadows, and pill colors (e.g., Cyan for rate, Pink for askout, Blue for voice).

## Environment Variables
The application requires only two environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_ASKOUT_SUBMIT_URL=https://<your-project>.supabase.co/functions/v1/submit-signal
```
*Note: The `anon_key` is not required, as requests bypass PostgREST and hit the Deno Edge Function directly.*
