import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AskOut — Anonymous Messages',
    description: 'Send anonymous messages. They spend Aura to find out who you are.',
    icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Space+Mono:wght@400;700&display=swap"
                    rel="stylesheet"
                />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <meta name="theme-color" content="#000000" />
            </head>
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
