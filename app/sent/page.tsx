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
                Sent.
            </h1>

            <p className="ao-sent-sub ao-sent-sub-large">
                They'll never know it was you.
            </p>

            <div className="ao-sent-divider" />

            <div className="ao-sent-acquisition">
                <p className="ao-acq-text">Want to know what people think about YOU?</p>
                <a
                    href="https://apps.apple.com/app/com.maxify.official"
                    className="ao-sent-cta"
                    target="_blank"
                    rel="noopener noreferrer"
                    id="askout-download-cta"
                >
                    Create your AskOut ⚡
                </a>
            </div>

            <Link href="/" className="ao-sent-send-another">
                ← Send another message
            </Link>
        </main>
    );
}
