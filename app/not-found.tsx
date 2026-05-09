import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Link Not Found | AskOut',
    description: 'This AskOut link does not exist or has expired.',
};

export default function NotFound() {
    return (
        <main style={{
            background: '#000',
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#fff',
            padding: '40px 24px',
        }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
                <div style={{ fontSize: '56px', marginBottom: '20px' }}>🔗</div>
                <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '10px' }}>
                    Link not found
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
                    This AskOut link doesn&apos;t exist or has expired. The person may have changed their username.
                </p>
                <a
                    href="https://apps.apple.com/app/com.maxify.official"
                    style={{
                        display: 'block',
                        background: '#fff',
                        color: '#000',
                        borderRadius: '100px',
                        padding: '14px 28px',
                        fontSize: '15px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        marginBottom: '12px',
                    }}
                >
                    Create your own AskOut ⚡
                </a>
                <Link
                    href="/"
                    style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '14px',
                        textDecoration: 'none',
                    }}
                >
                    ← Go home
                </Link>
            </div>
        </main>
    );
}
