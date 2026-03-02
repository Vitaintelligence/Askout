import { Metadata } from 'next';
import Link from 'next/link';
import '../globals.css';
import '../../components/askout.css';

export const metadata: Metadata = {
    title: 'Message Sent | AskOut',
    description: 'Your anonymous message was delivered successfully.',
};

export default function SentPage() {
    return (
        <main className="ao-sent-page">
            <div className="ao-sent-star">✦</div>

            <h1 className="ao-sent-headline">
                Sent. They&apos;ll never know it was you.
            </h1>

            <p className="ao-sent-sub">Unless they spend their Aura. 😉</p>

            <a
                href="https://apps.apple.com/app/maxify/id6741833898"
                className="ao-sent-cta"
                target="_blank"
                rel="noopener noreferrer"
                id="askout-download-cta"
            >
                📲 Download Maxify
            </a>

            <Link href="/" className="ao-sent-send-another">
                ← Back to Maxify
            </Link>
        </main>
    );
}
