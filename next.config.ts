import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                // iOS requires AASA served without extension and as application/json
                source: '/.well-known/apple-app-site-association',
                headers: [{ key: 'Content-Type', value: 'application/json' }],
            },
        ];
    },
    async redirects() {
        return [
            {
                source: '/ref/:code',
                destination: 'https://glowrizz.club?ref=:code',
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
