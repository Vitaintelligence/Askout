'use client';

import { useEffect } from 'react';

export default function UsernameError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[username] route error:', error.message, error.digest);
    }, [error]);

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
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✦</div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '10px' }}>
                    Couldn&apos;t load this link
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
                    Something went wrong loading this AskOut. Try again or get the Maxify app.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={reset}
                        style={{
                            background: '#00FFCC',
                            color: '#000',
                            border: 'none',
                            borderRadius: '100px',
                            padding: '14px 28px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                    <a
                        href="https://apps.apple.com/app/com.maxify.official"
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            borderRadius: '100px',
                            padding: '14px 28px',
                            fontSize: '15px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'block',
                        }}
                    >
                        Get Maxify →
                    </a>
                </div>
            </div>
        </main>
    );
}
