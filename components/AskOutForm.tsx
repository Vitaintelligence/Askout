'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './askout.css';

type SignalPayloadType = 'text' | 'rating' | 'audio' | 'image' | 'askout';

interface SignalConfig {
    type: SignalPayloadType;
    prompt: string;
    accent: string;
}

const SLUG_CONFIGS: Record<string, SignalConfig> = {
    // Audio slugs
    voice: { type: 'audio', prompt: "Say something you'd never type.", accent: '#3b82f6' },
    note: { type: 'audio', prompt: "Leave me a voice note.", accent: '#3b82f6' },
    secret: { type: 'audio', prompt: "Whisper a secret.", accent: '#8b5cf6' },

    // Image slugs
    fit: { type: 'image', prompt: "Rate my fit. Brutally.", accent: '#a855f7' },
    photo: { type: 'image', prompt: "Send a photo.", accent: '#0ea5e9' },

    // Rating slugs
    rate: { type: 'rating', prompt: "How hot am I on a scale of 1-10?", accent: '#06b6d4' },
    energy: { type: 'rating', prompt: "Rate my energy 1-10.", accent: '#f59e0b' },
    temp: { type: 'rating', prompt: "Temperature check 1-10.", accent: '#ef4444' },

    // AskOut / High Tension
    askout: { type: 'askout', prompt: "Would you? Tell me.", accent: '#f43f5e' },
    truth: { type: 'askout', prompt: "Tell me the truth.", accent: '#e11d48' },
    confession: { type: 'askout', prompt: "Confess something.", accent: '#be123c' },

    // Custom text slugs
    vibe: { type: 'text', prompt: "What's my vibe?", accent: '#00FFCC' },
    compliment: { type: 'text', prompt: "Give me a compliment.", accent: '#10b981' },
    song: { type: 'text', prompt: "Send a song that reminds you of me.", accent: '#8b5cf6' },
    impression: { type: 'text', prompt: "First impression of me?", accent: '#38bdf8' },
    'three-words': { type: 'text', prompt: "Describe me in 3 words.", accent: '#fbbf24' },
};

const DEFAULT_CONFIG: SignalConfig = {
    type: 'text',
    prompt: "Say something. I won't know it's you.",
    accent: '#00FFCC'
};

interface AskOutFormProps {
    username: string;
    slug?: string;
    promptText?: string;
}

export default function AskOutForm({ username, slug, promptText }: AskOutFormProps) {
    const router = useRouter();

    const config = slug && SLUG_CONFIGS[slug.toLowerCase()]
        ? SLUG_CONFIGS[slug.toLowerCase()]
        : DEFAULT_CONFIG;

    const [message, setMessage] = useState('');
    const [rating, setRating] = useState<number | null>(null);
    const [askoutYesNo, setAskoutYesNo] = useState<'yes' | 'no' | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [howOpen, setHowOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [fomoCount, setFomoCount] = useState<string>('');

    useEffect(() => {
        if ((config.type === 'text' || config.type === 'askout') && textareaRef.current) {
            textareaRef.current.focus();
        }
        setFomoCount((Math.floor(Math.random() * 40000) + 10000).toLocaleString());
    }, [config.type]);

    const isSubmitDisabled = () => {
        if (isLoading) return true;
        if (config.type === 'text') return message.trim().length === 0;
        if (config.type === 'askout') return message.trim().length === 0 && !askoutYesNo;
        if (config.type === 'rating' || (config.type === 'image' && slug === 'fit')) return rating === null;
        return false; // For audio/image stubs, we'll let them click submit to see the 'dummy' logic or send empty.
    };

    const handleSubmit = async () => {
        if (isSubmitDisabled()) return;
        setIsLoading(true);
        setError(null);

        // Block Audio/Image stubs from actually throwing real errors if there's no real file.
        // We send dummy payloads just to simulate it working in the app until file upload is built.

        try {
            let fingerprint = 'unknown';
            try {
                const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                fingerprint = result.visitorId;
            } catch {
                // Continue fully anonymous
            }

            let payload: any = {};
            if (config.type === 'text') {
                payload = { message: message ? message.trim() : payload }; // Keep string or mutated inputs based on type
                if (slug === 'three-words') payload.message = message.split(',').filter(Boolean).join(' · ');
            } else if (config.type === 'rating') {
                payload = { score: rating };
            } else if (config.type === 'askout') {
                payload = { message: message.trim(), choice: askoutYesNo };
            } else if (config.type === 'audio') {
                payload = { audio_url: 'https://example.com/audio-stub.mp3', duration_ms: 5000 };
            } else if (config.type === 'image') {
                payload = { image_url: 'https://example.com/image-stub.png', score: rating };
            }

            const envSubmitUrl = process.env.NEXT_PUBLIC_ASKOUT_SUBMIT_URL;
            const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

            let submitUrl = envSubmitUrl;

            if (!submitUrl && envSupabaseUrl) {
                submitUrl = `${envSupabaseUrl}/functions/v1/submit-signal`;
            }

            // Fallback for missing env vars during local dev where the server wasn't restarted
            if (!submitUrl || submitUrl.includes('undefined')) {
                console.warn('Next.js environment variables are missing. Using hardcoded fallback URL for Askout submit-signal.');
                submitUrl = 'https://wwzgscjnovpuqfvmccxp.supabase.co/functions/v1/submit-signal';
            }

            const res = await fetch(submitUrl as string, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_slug: username, // Important: app schema uses 'slug' column to store username
                    type: config.type,
                    payload,
                    fingerprint,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success !== false) {
                router.push('/sent');
            } else {
                setError(data.error ?? 'Something went wrong. Please try again.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Askout submit error:', err);
            setError('Failed to send. Check your connection and try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="ao-page" style={{ '--theme-accent': config.accent } as React.CSSProperties}>
            {/* Header */}
            <header className="ao-header">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/askout.webp" alt="AskOut" className="ao-logo-img" />
                <div className="ao-header-spacer" />
                <span className="ao-header-badge" style={{ color: config.accent, borderColor: config.accent, backgroundColor: 'transparent' }}>
                    {slug ? slug.toUpperCase() : 'ANONYMOUS'}
                </span>
            </header>

            <div className="ao-container">
                {/* Recipient Card */}
                <div className="ao-recipient-card" style={{ borderColor: 'var(--theme-accent)' }}>
                    <p className={promptText ? "ao-card-prompt-custom" : "ao-card-prompt-default"}>
                        {promptText || config.prompt}
                    </p>
                    <span className="ao-card-watermark">askout.link/{username}{slug ? `/${slug}` : ''}</span>
                </div>

                {/* Dynamic Input Section based on slug type */}
                <div className="ao-input-section" key={config.type}>

                    {/* Text Input (Standard OR Three Words) */}
                    {(config.type === 'text') && (
                        slug === 'three-words' ? (
                            <div className="ao-three-words-wrap">
                                {[0, 1, 2].map((i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        className="ao-three-chips-input"
                                        placeholder={`Word ${i + 1}`}
                                        value={message.split(',')[i] || ''}
                                        maxLength={15}
                                        onChange={(e) => {
                                            const words = message.split(',');
                                            // Ensure we always have an array of 3 parts to mutate
                                            while (words.length < 3) words.push('');
                                            words[i] = e.target.value.replace(/,/g, '');
                                            setMessage(words.join(','));
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="ao-textarea-wrap">
                                <textarea
                                    ref={textareaRef}
                                    className="ao-textarea"
                                    placeholder={config.prompt}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                    rows={5}
                                    maxLength={500}
                                    id="askout-message-input"
                                />
                                <span className="ao-char-count">{message.length}/500</span>
                            </div>
                        )
                    )}

                    {/* AskOut / High Tension Input */}
                    {(config.type === 'askout') && (
                        <div className="ao-askout-wrap">
                            {slug === 'askout' ? (
                                <div className="ao-yesno-toggles">
                                    <button
                                        className={`ao-yesno-btn ${askoutYesNo === 'yes' ? 'selected' : ''}`}
                                        onClick={() => setAskoutYesNo('yes')}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        className={`ao-yesno-btn ${askoutYesNo === 'no' ? 'selected' : ''}`}
                                        onClick={() => setAskoutYesNo('no')}
                                    >
                                        No
                                    </button>
                                </div>
                            ) : null}

                            <div className="ao-textarea-wrap">
                                <textarea
                                    ref={textareaRef}
                                    className="ao-textarea ao-textarea-hightension"
                                    placeholder={slug === 'askout' ? "Or say something else..." : config.prompt}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                    rows={4}
                                    maxLength={500}
                                />
                            </div>
                        </div>
                    )}

                    {/* Rate Input (Slider for Energy, Chips for Rest) */}
                    {(config.type === 'rating' || (config.type === 'image' && slug === 'fit')) && (
                        <div className="ao-rate-wrap">
                            {slug === 'energy' ? (
                                <div className="ao-slider-wrap">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={rating || 5}
                                        onChange={(e) => setRating(Number(e.target.value))}
                                        className="ao-slider"
                                    />
                                    <div className="ao-slider-ticks">
                                        <span>1</span>
                                        <span>5</span>
                                        <span>10</span>
                                    </div>
                                    <p className="ao-rate-label has-selection ao-energy-label">
                                        {rating === null ? 'Slide to rate energy' : `${rating}/10 Energy`}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="ao-rate-chips" role="group" aria-label="Rate 1 to 10">
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => setRating(n)}
                                                className={`ao-rate-chip${rating === n ? ' selected' : ''}`}
                                                aria-pressed={rating === n}
                                                id={`askout-rate-${n}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <p className={`ao-rate-label${rating !== null ? ' has-selection' : ''}`}>
                                        {rating === null
                                            ? 'Tap a number to rate'
                                            : rating <= 3
                                                ? `${rating}/10 — Brutally honest 🥶`
                                                : rating <= 6
                                                    ? `${rating}/10 — Solid pick 👌`
                                                    : rating <= 8
                                                        ? `${rating}/10 — Pretty fire 🔥`
                                                        : `${rating}/10 — Absolute legend ✦`}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Audio Input Stub */}
                    {config.type === 'audio' && (
                        <div className="ao-media-stub">
                            <div className="ao-media-stub-icon">🎙️</div>
                            <p>Tap to record (Coming soon)</p>
                        </div>
                    )}

                    {/* Image Input Stub */}
                    {config.type === 'image' && (
                        <div className="ao-media-stub">
                            <div className="ao-media-stub-icon">📸</div>
                            <p>Tap to upload photo (Coming soon)</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && <div className="ao-error" role="alert">{error}</div>}

                    {/* Submit */}
                    <button
                        className={`ao-submit-btn${isLoading ? ' loading' : ''}`}
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled()}
                        id="askout-submit"
                    >
                        {isLoading ? (
                            <><span className="ao-spinner" /> Sending...</>
                        ) : (
                            <>Send Anonymously 🔒</>
                        )}
                    </button>

                    {/* FOMO Section */}
                    {fomoCount && (
                        <div className="ao-fomo-section">
                            <span className="ao-fomo-text">
                                🔥 {fomoCount} people just tapped the button
                            </span>
                            <a
                                href="https://glowrizz.club"
                                className="ao-fomo-cta"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Get your link now!
                            </a>
                        </div>
                    )}

                    {/* How it works */}
                    <div className="ao-how-wrap">
                        <button
                            className="ao-how-toggle"
                            onClick={() => setHowOpen((v) => !v)}
                            aria-expanded={howOpen}
                        >
                            <span>How does this work?</span>
                            <span className={`ao-how-chevron${howOpen ? ' open' : ''}`}>▼</span>
                        </button>
                        <div className={`ao-how-body${howOpen ? ' open' : ''}`}>
                            <div className="ao-how-item">
                                <span className="ao-how-item-icon">🔒</span>
                                <span>Fully anonymous — your name is never attached to your message.</span>
                            </div>
                            <div className="ao-how-item">
                                <span className="ao-how-item-icon">💎</span>
                                <span>They spend Aura to see who you are. It costs them, not you.</span>
                            </div>
                            <div className="ao-how-item">
                                <span className="ao-how-item-icon">✦</span>
                                <span>Your identity is never revealed directly — only through Aura spend.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
