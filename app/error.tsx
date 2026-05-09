'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global error:', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '40px 24px', maxWidth: '400px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✦</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
                        This link might have expired or something unexpected happened. Try again or download Maxify.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={reset}
                            style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '100px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Try Again
                        </button>
                        <a
                            href="https://apps.apple.com/app/com.maxify.official"
                            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '100px', padding: '14px 28px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'block' }}
                        >
                            Get Maxify →
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}
