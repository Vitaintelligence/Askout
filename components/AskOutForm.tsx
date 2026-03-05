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
    voice: { type: 'audio', prompt: "Say something you'd never type.", accent: '#3b82f6' },
    note: { type: 'audio', prompt: "Leave me a voice note.", accent: '#3b82f6' },
    secret: { type: 'audio', prompt: "Whisper a secret.", accent: '#8b5cf6' },
    fit: { type: 'image', prompt: "Rate my fit. Brutally.", accent: '#a855f7' },
    photo: { type: 'image', prompt: "Send a photo.", accent: '#0ea5e9' },
    rate: { type: 'rating', prompt: "How hot am I on a scale of 1-10?", accent: '#06b6d4' },
    energy: { type: 'rating', prompt: "Rate my energy 1-10.", accent: '#f59e0b' },
    temp: { type: 'rating', prompt: "Temperature check 1-10.", accent: '#ef4444' },
    askout: { type: 'askout', prompt: "Would you? Tell me.", accent: '#f43f5e' },
    truth: { type: 'askout', prompt: "Tell me the truth.", accent: '#e11d48' },
    confession: { type: 'askout', prompt: "Confess something.", accent: '#be123c' },
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

// ── Suggestion chips per slug ─────────────────────────────────────────────────
// These give the sender ideas without requiring them to think — just tap or ignore.
const SUGGESTIONS: Record<string, string[]> = {
    // Default text
    default: [
        "you give main character energy fr",
        "genuinely intimidated by you ngl",
        "ur vibe is unmatched",
        "the way you carry yourself tho 👀",
        "you seem like you'd be fun at 2am",
        "you're giving a lot without trying",
        "lowkey been thinking about you",
        "you're more interesting than you think",
        "something about you hits different",
        "you move like you know something we don't",
        "idk you but i feel like i do",
        "you radiate 'has good music taste'",
        "you seem like a safe person to talk to",
        "you give off very specific energy and i'm into it",
        "you're built different and it shows",
    ],

    // Vibe
    vibe: [
        "chaotic good",
        "main character who doesn't know it yet",
        "coffee shop at midnight",
        "that one song that hits at 3am",
        "quiet storm",
        "summer thunderstorm energy",
        "vintage but make it now",
        "the friend everyone calls at 2am",
        "soft but dangerous",
        "cool without trying",
        "you're giving old money without the money",
        "golden hour personified",
        "overthinks everything, makes it beautiful",
        "mysterious but in the warm way",
    ],

    // Compliment
    compliment: [
        "the way you exist is a compliment to everyone around you",
        "your presence actually changes the energy of a room",
        "you make people feel seen without even trying",
        "your confidence is the quiet kind — the best kind",
        "genuinely one of the most interesting people i've come across",
        "you have a way of making everything feel intentional",
        "there's something magnetic about how you move through the world",
        "you're beautiful in a way that's hard to explain",
        "you make ordinary things feel cinematic",
        "the energy you give off is genuinely rare",
        "you're the type of person people never forget",
        "your laugh sounds like relief",
        "you have good eyes",
        "you're effortlessly the most interesting person here",
    ],

    // Song / send a song
    song: [
        "Cigarettes After Sex — Apocalypse",
        "Frank Ocean — Godspeed",
        "Tame Impala — Eventually",
        "Mitski — First Love / Late Spring",
        "Rex Orange County — Loving is Easy",
        "Daniel Caesar — Best Part",
        "Clairo — Pretty Girl",
        "Steve Lacy — Bad Habit",
        "SZA — Good Days",
        "Mac Miller — Small Worlds",
        "Tyler The Creator — See You Again",
        "Arctic Monkeys — Do I Wanna Know",
        "Hozier — Take Me to Church",
        "Lana Del Rey — Video Games",
        "Conan Gray — Heather",
        "Phoebe Bridgers — Motion Sickness",
        "yeule — Serotonin II",
    ],

    // Impression
    impression: [
        "immediately felt like I already knew you",
        "you seemed intimidating but in a good way",
        "I thought you were way out of my league",
        "genuinely thought you were famous or something",
        "you seemed like someone with a lot going on under the surface",
        "I noticed you before you noticed me",
        "I assumed you had a very specific music taste",
        "I thought you were the quiet type. I was wrong",
        "you looked like someone people write songs about",
        "first thing I thought: this person is interesting",
        "you gave off 'knows something everyone else doesn't' energy",
        "I immediately wanted to know what you were thinking",
    ],

    // Three words (chips map to full 3-word responses)
    'three-words': [
        "confident, calm, magnetic",
        "soft, sharp, rare",
        "quiet, electric, real",
        "chaotic, beautiful, intentional",
        "warm, weird, wonderful",
        "bold, gentle, interesting",
        "loud in silence",
        "way too cool",
        "effortless, deep, real",
        "safe but exciting",
        "golden hour vibes",
        "dangerous kind of calm",
    ],

    // AskOut yes/no — optional follow-up text suggestions
    askout: [
        "I'd ask you out in a heartbeat if I had the nerve",
        "honestly yes but you terrify me",
        "I think about this more than I should",
        "been wanting to say this for a while",
        "100% yes. there I said it.",
        "you already know the answer",
        "ask me in person and see what happens",
    ],

    // Truth
    truth: [
        "I think you're better than you give yourself credit for",
        "you intimidate people without realising it",
        "you've been on my mind more than I'd admit",
        "I think you're one of those rare people",
        "I feel like you're not fully seen yet — but you will be",
        "you're the realest person I've come across in a while",
        "something about you just hits different and I can't explain it",
    ],

    // Confession
    confession: [
        "I've thought about talking to you way more than I have",
        "I follow you but pretend I don't notice you",
        "I replay conversations with you more than I should",
        "you're the reason I check the room when I walk in",
        "I've mentioned you to people who don't even know you",
        "I got nervous the last time I saw you and played it off badly",
        "I've had a thing for you longer than I'd ever admit",
    ],

    // Rate (number selected separately, but text chips give context)
    rate: [
        "genuinely a 10, I'm just scared to say it",
        "objectively very high",
        "higher than you think",
        "off the charts tbh",
    ],
};

// Ghost text cycling — shown in the textarea before user types
const GHOST_TEXT: Record<string, string[]> = {
    default: [
        "you give main character energy fr...",
        "something about you hits different...",
        "genuinely been thinking about you...",
        "you're more interesting than you think...",
        "idk you but i feel like i do...",
    ],
    vibe: [
        "chaotic good...",
        "quiet storm...",
        "main character who doesn't know it yet...",
        "golden hour personified...",
    ],
    compliment: [
        "your presence changes the energy of a room...",
        "you're the type of person people never forget...",
        "you make people feel seen without even trying...",
        "you're beautiful in a way that's hard to explain...",
    ],
    song: [
        "Frank Ocean — Godspeed",
        "Cigarettes After Sex — Apocalypse",
        "Steve Lacy — Bad Habit",
        "Mitski — First Love / Late Spring",
    ],
    impression: [
        "immediately felt like I already knew you...",
        "I thought you were way out of my league...",
        "you looked like someone people write songs about...",
    ],
    askout: [
        "I'd ask you out if I had the nerve...",
        "honestly yes but you terrify me...",
        "been wanting to say this for a while...",
    ],
    truth: [
        "I think you're better than you give yourself credit for...",
        "you've been on my mind more than I'd admit...",
    ],
    confession: [
        "I've thought about talking to you way more than I have...",
        "you're the reason I check the room when I walk in...",
        "I've had a thing for you longer than I'd ever admit...",
    ],
};

interface AskOutFormProps {
    username: string;
    slug?: string;
    promptText?: string;
}

function getSubmitUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_ASKOUT_SUBMIT_URL;
    if (explicit && !explicit.includes('undefined')) return explicit;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (base && !base.includes('undefined')) return `${base}/functions/v1/submit-signal`;
    return 'https://wwzgscjnovpuqfvmccxp.supabase.co/functions/v1/submit-signal';
}

function getUploadUrl(): string {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (base && !base.includes('undefined')) return `${base}/functions/v1/upload-media`;
    return 'https://wwzgscjnovpuqfvmccxp.supabase.co/functions/v1/upload-media';
}

function collectClientMetadata() {
    const ua = navigator.userAgent ?? '';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown';
    const screen = `${window.screen.width}x${window.screen.height}`;

    let browser = 'unknown';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

    let os = 'unknown';
    if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/windows nt/i.test(ua)) os = 'Windows';
    else if (/mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/cros/i.test(ua)) os = 'ChromeOS';

    return { timezone, screen, browser, os };
}

async function uploadMedia(blob: Blob, mediaType: 'audio' | 'image', recipientSlug: string) {
    const form = new FormData();
    const ext = blob.type.split('/')[1] ?? (mediaType === 'audio' ? 'webm' : 'jpg');
    form.append('file', blob, `upload.${ext}`);
    form.append('media_type', mediaType);
    form.append('recipient_slug', recipientSlug);

    const res = await fetch(getUploadUrl(), { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.url) throw new Error(data.error ?? `Upload failed (${res.status})`);
    return { url: data.url as string, path: data.path as string };
}

export default function AskOutForm({ username, slug, promptText }: AskOutFormProps) {
    const router = useRouter();

    const config = slug && SLUG_CONFIGS[slug.toLowerCase()]
        ? SLUG_CONFIGS[slug.toLowerCase()]
        : DEFAULT_CONFIG;

    const slugKey = slug?.toLowerCase() ?? 'default';

    // Resolved suggestion lists
    const suggestions: string[] = SUGGESTIONS[slugKey] ?? SUGGESTIONS.default;
    const ghostTexts: string[] = GHOST_TEXT[slugKey] ?? GHOST_TEXT.default;

    const [message, setMessage] = useState('');
    const [rating, setRating] = useState<number | null>(null);
    const [askoutYesNo, setAskoutYesNo] = useState<'yes' | 'no' | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [howOpen, setHowOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Ghost text cycling
    const [ghostIndex, setGhostIndex] = useState(0);
    const [ghostVisible, setGhostVisible] = useState(true);
    const ghostIntervalRef = useRef<number | null>(null);

    // Media
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [fomoCount, setFomoCount] = useState<string>('');

    // ── Ghost text cycle ──────────────────────────────────────────────────────
    useEffect(() => {
        if ((config.type === 'text' || config.type === 'askout') && textareaRef.current) {
            textareaRef.current.focus();
        }
        setFomoCount((Math.floor(Math.random() * 11) + 50).toString());

        // Reset ghost text when config changes
        setGhostIndex(0);
        setGhostVisible(true);

        if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);

        ghostIntervalRef.current = window.setInterval(() => {
            setGhostVisible(false);
            setTimeout(() => {
                setGhostIndex(prev => (prev + 1) % ghostTexts.length);
                setGhostVisible(true);
            }, 400);
        }, 3200);

        return () => {
            if (ghostIntervalRef.current) clearInterval(ghostIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.type]);

    // ── Suggestion chip click ────────────────────────────────────────────────
    const applySuggestion = (text: string) => {
        if (slugKey === 'three-words') {
            // Split on comma or space separators and populate the 3 fields
            const parts = text.split(/,\s*|\s+/);
            setMessage(parts.slice(0, 3).join(','));
        } else {
            setMessage(text);
        }
        // Focus textarea after chip tap
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    // ── Media Handlers ───────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = window.setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 60) { stopRecording(); return 60; }
                    return prev + 1;
                });
            }, 1000);
        } catch {
            setError('Microphone access is required to record audio.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    };

    const resetAudio = () => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
        setImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    const isSubmitDisabled = () => {
        if (isLoading) return true;
        if (config.type === 'text') return message.trim().length === 0;
        if (config.type === 'askout') return message.trim().length === 0 && !askoutYesNo;
        if (config.type === 'rating') return rating === null;
        if (config.type === 'image') return slug === 'fit' ? (rating === null || !imageFile) : !imageFile;
        if (config.type === 'audio') return !audioBlob;
        return false;
    };

    const handleSubmit = async () => {
        if (isSubmitDisabled()) return;
        setIsLoading(true);
        setError(null);
        setUploadProgress(null);

        try {
            let fingerprint = 'unknown';
            try {
                const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
                const fp = await FingerprintJS.load();
                fingerprint = (await fp.get()).visitorId;
            } catch { /* continue anonymous */ }

            const clientMeta = collectClientMetadata();
            const ua = navigator.userAgent || '';
            let clientHint = 'desktop user';
            if (/iphone|ipad|ipod/i.test(ua)) clientHint = 'iPhone user';
            else if (/android/i.test(ua)) clientHint = 'Android user';
            else if (/mac/i.test(navigator.platform ?? '')) clientHint = 'Mac user';
            else if (/win/i.test(navigator.platform ?? '')) clientHint = 'Windows user';

            let locationData: { lat: number; lng: number } | null = null;
            try {
                if (navigator.geolocation) {
                    locationData = await new Promise(resolve => {
                        navigator.geolocation.getCurrentPosition(
                            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                            () => resolve(null),
                            { timeout: 4000, maximumAge: 60000 }
                        );
                    });
                }
            } catch { /* no geo */ }

            let payload: Record<string, unknown> = {};

            if (config.type === 'text') {
                const msg = message.trim();
                payload = { message: slug === 'three-words' ? msg.split(',').filter(Boolean).join(' · ') : msg };
            } else if (config.type === 'rating') {
                payload = { message: `Rating: ${rating}/10`, score: rating };
            } else if (config.type === 'askout') {
                payload = { message: message.trim(), choice: askoutYesNo };
            } else if (config.type === 'audio' && audioBlob) {
                setUploadProgress('Uploading audio...');
                const { url, path } = await uploadMedia(audioBlob, 'audio', username);
                payload = { media_url: url, media_path: path, duration_ms: recordingTime * 1000 };
            } else if (config.type === 'image' && imageFile) {
                setUploadProgress('Uploading image...');
                const { url, path } = await uploadMedia(imageFile, 'image', username);
                payload = { media_url: url, media_path: path, score: rating };
            }

            setUploadProgress(null);

            const res = await fetch(getSubmitUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_slug: username,
                    type: config.type,
                    payload,
                    fingerprint,
                    client_hint: clientHint,
                    location: locationData,
                    metadata: {
                        timezone: clientMeta.timezone,
                        screen: clientMeta.screen,
                        browser: clientMeta.browser,
                        os: clientMeta.os,
                    },
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 429) {
                setError("You're sending too fast. Wait a moment and try again.");
                setIsLoading(false);
                return;
            }

            if (res.ok && data.success !== false) {
                router.push('/sent');
            } else {
                setError(data.error ?? 'Something went wrong. Please try again.');
                setIsLoading(false);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to send. Check your connection and try again.';
            setError(msg);
            setIsLoading(false);
            setUploadProgress(null);
        }
    };

    // ── Suggestion chip row (only for text/askout types) ─────────────────────
    const showSuggestions = config.type === 'text' || config.type === 'askout';

    return (
        <div className="ao-page" style={{ '--theme-accent': config.accent } as React.CSSProperties}>
            <header className="ao-header">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/askout.webp" alt="AskOut" className="ao-logo-img" />
                <div className="ao-header-spacer" />
                <span className="ao-header-badge" style={{ color: config.accent, borderColor: config.accent, backgroundColor: 'transparent' }}>
                    {slug ? slug.toUpperCase() : 'ANONYMOUS'}
                </span>
            </header>

            <div className="ao-container">
                <div className="ao-recipient-card" style={{ borderColor: 'var(--theme-accent)' }}>
                    <p className={promptText ? "ao-card-prompt-custom" : "ao-card-prompt-default"}>
                        {promptText || config.prompt}
                    </p>
                    <span className="ao-card-watermark">askout.link/{username}{slug ? `/${slug}` : ''}</span>
                </div>

                <div className="ao-input-section" key={config.type}>

                    {/* ── Text Input ── */}
                    {config.type === 'text' && (
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
                                            while (words.length < 3) words.push('');
                                            words[i] = e.target.value.replace(/,/g, '');
                                            setMessage(words.join(','));
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="ao-textarea-wrap">
                                {/* Ghost text overlay — fades when user starts typing */}
                                {message.length === 0 && (
                                    <div
                                        className={`ao-ghost-text ${ghostVisible ? 'ao-ghost-visible' : 'ao-ghost-hidden'}`}
                                        aria-hidden="true"
                                    >
                                        {ghostTexts[ghostIndex]}
                                    </div>
                                )}
                                <textarea
                                    ref={textareaRef}
                                    className="ao-textarea"
                                    placeholder=""
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

                    {/* ── AskOut / High Tension ── */}
                    {config.type === 'askout' && (
                        <div className="ao-askout-wrap">
                            {slug === 'askout' && (
                                <div className="ao-yesno-toggles">
                                    <button className={`ao-yesno-btn ${askoutYesNo === 'yes' ? 'selected' : ''}`} onClick={() => setAskoutYesNo('yes')}>Yes</button>
                                    <button className={`ao-yesno-btn ${askoutYesNo === 'no' ? 'selected' : ''}`} onClick={() => setAskoutYesNo('no')}>No</button>
                                </div>
                            )}
                            <div className="ao-textarea-wrap">
                                {message.length === 0 && (
                                    <div
                                        className={`ao-ghost-text ${ghostVisible ? 'ao-ghost-visible' : 'ao-ghost-hidden'}`}
                                        aria-hidden="true"
                                    >
                                        {ghostTexts[ghostIndex]}
                                    </div>
                                )}
                                <textarea
                                    ref={textareaRef}
                                    className="ao-textarea ao-textarea-hightension"
                                    placeholder=""
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                    rows={4}
                                    maxLength={500}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Suggestion chips — shown for text + askout types ── */}
                    {showSuggestions && message.length === 0 && slug !== 'three-words' && (
                        <div className="ao-suggestions-wrap" aria-label="Suggestion chips">
                            <p className="ao-suggestions-label">tap to use →</p>
                            <div className="ao-suggestions-scroll">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        className="ao-suggestion-chip"
                                        onClick={() => applySuggestion(s)}
                                        type="button"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Image Capture ── */}
                    {config.type === 'image' && (
                        <div className="ao-image-capture-wrap">
                            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                            {imagePreviewUrl ? (
                                <div className="ao-image-preview">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imagePreviewUrl} alt="Upload preview" className="ao-preview-img" />
                                    <button className="ao-preview-retake" onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreviewUrl(null); }}>
                                        × Remove Image
                                    </button>
                                </div>
                            ) : (
                                <div className="ao-media-stub ao-media-stub-image" onClick={() => fileInputRef.current?.click()}>
                                    <span className="ao-media-icon">📸</span>
                                    <span>Tap to take a photo or upload</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Rating chips ── */}
                    {(config.type === 'rating' || config.type === 'image') && (
                        <div className="ao-rate-wrap">
                            {slug === 'energy' ? (
                                <div className="ao-slider-wrap">
                                    <input type="range" min="1" max="10" step="1" value={rating || 5} onChange={(e) => setRating(Number(e.target.value))} className="ao-slider" id="askout-slider" />
                                    <div className="ao-slider-ticks"><span>1</span><span>5</span><span>10</span></div>
                                    <p className="ao-rate-label has-selection ao-energy-label">{rating === null ? 'Slide to rate energy' : `${rating}/10 Energy`}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="ao-rate-chips" role="group" aria-label="Rate 1 to 10">
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                            <button key={n} onClick={(e) => { e.preventDefault(); setRating(n); }} className={`ao-rate-chip${rating === n ? ' selected' : ''}`} aria-pressed={rating === n} id={`askout-rate-${n}`}>{n}</button>
                                        ))}
                                    </div>
                                    <p className={`ao-rate-label${rating !== null ? ' has-selection' : ''}`}>
                                        {rating === null ? 'Tap a number to rate'
                                            : rating <= 3 ? `${rating}/10 — Brutally honest 🥶`
                                                : rating <= 6 ? `${rating}/10 — Solid pick 👌`
                                                    : rating <= 8 ? `${rating}/10 — Pretty fire 🔥`
                                                        : `${rating}/10 — Absolute legend ✦`}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Audio Recorder ── */}
                    {config.type === 'audio' && (
                        <div className="ao-audio-capture-wrap">
                            {!audioUrl ? (
                                <button
                                    className={`ao-media-stub ao-media-stub-audio ${isRecording ? 'recording' : ''}`}
                                    onMouseDown={(e) => { e.preventDefault(); startRecording(); }}
                                    onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
                                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                >
                                    <span className={`ao-media-icon ${isRecording ? 'pulse' : ''}`}>{isRecording ? '🔴' : '🎙️'}</span>
                                    <span className="ao-recording-time">{isRecording ? `Recording... 0:${recordingTime.toString().padStart(2, '0')}` : 'Hold to record voice note'}</span>
                                </button>
                            ) : (
                                <div className="ao-audio-preview">
                                    <audio controls src={audioUrl} className="ao-audio-player" />
                                    <button className="ao-preview-retake" onClick={(e) => { e.preventDefault(); resetAudio(); }}>🗑️ Retake</button>
                                </div>
                            )}
                            <p className="ao-audio-hint">Max 60 seconds</p>
                        </div>
                    )}

                    {uploadProgress && (
                        <div className="ao-upload-progress" role="status">
                            <span className="ao-spinner" /> {uploadProgress}
                        </div>
                    )}
                    {error && <div className="ao-error" role="alert">{error}</div>}

                    <button className={`ao-submit-btn${isLoading ? ' loading' : ''}`} onClick={handleSubmit} disabled={isSubmitDisabled()} id="askout-submit">
                        {isLoading ? (<><span className="ao-spinner" /> {uploadProgress ?? 'Sending...'}</>) : (<>Send Anonymously 🔒</>)}
                    </button>

                    {fomoCount && (
                        <div className="ao-fomo-section">
                            <span className="ao-fomo-text">🔥 {fomoCount} users tapped the button</span>
                            <a href="https://glowrizz.club" className="ao-fomo-cta" target="_blank" rel="noopener noreferrer">Get your link now!</a>
                        </div>
                    )}

                    <div className="ao-how-wrap">
                        <button className="ao-how-toggle" onClick={() => setHowOpen(v => !v)} aria-expanded={howOpen}>
                            <span>How does this work?</span>
                            <span className={`ao-how-chevron${howOpen ? ' open' : ''}`}>▼</span>
                        </button>
                        <div className={`ao-how-body${howOpen ? ' open' : ''}`}>
                            <div className="ao-how-item"><span className="ao-how-item-icon">🔒</span><span>Fully anonymous — your name is never attached to your message.</span></div>
                            <div className="ao-how-item"><span className="ao-how-item-icon">💎</span><span>They spend Aura to see who you are. It costs them, not you.</span></div>
                            <div className="ao-how-item"><span className="ao-how-item-icon">✦</span><span>Your identity is never revealed directly — only through Aura spend.</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
