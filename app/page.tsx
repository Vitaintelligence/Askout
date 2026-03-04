import { redirect } from 'next/navigation';

// Opened without a slug — no user context.
// Redirect to Maxify app on the App Store.
export default function HomePage() {
    redirect('https://apps.apple.com/app/com.maxify.official');
}
