import { Metadata } from 'next';
import AskOutForm from '@/components/AskOutForm';

interface Props {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ p?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    return {
        title: `Send ${username} an anonymous message | AskOut`,
        description: `Send an anonymous message to ${username}. They spend Aura to find out who you are.`,
        openGraph: {
            title: `Send ${username} an anonymous message`,
            description: 'Fully anonymous. They spend Aura to see who you are.',
        },
        twitter: {
            card: 'summary',
            title: `Send ${username} an anonymous message`,
            description: 'Fully anonymous. They spend Aura to see who you are.',
        },
    };
}

export default async function UsernamePage({ params, searchParams }: Props) {
    const { username } = await params;
    const { p } = await searchParams;

    let promptText: string | undefined;
    if (p) {
        try {
            promptText = decodeURIComponent(p);
        } catch {
            promptText = undefined;
        }
    }

    return (
        <main style={{ background: '#000', minHeight: '100dvh' }}>
            <AskOutForm username={username} promptText={promptText} />
        </main>
    );
}
