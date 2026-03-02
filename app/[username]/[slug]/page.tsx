import { Metadata } from 'next';
import AskOutForm from '@/components/AskOutForm';

interface Props {
    params: Promise<{ username: string; slug: string }>;
    searchParams: Promise<{ p?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username, slug } = await params;
    return {
        title: `Send ${username} a message | AskOut`,
        description: `Send an anonymous ${slug} to ${username}. They spend Aura to find out who you are.`,
    };
}

export default async function UsernameSlugPage({ params, searchParams }: Props) {
    const { username, slug } = await params;
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
            <AskOutForm username={username} slug={slug} promptText={promptText} />
        </main>
    );
}
