'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AskoutClientConfig } from './utils';
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

    // Media Capture States
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [imageStr, setImageStr] = useState<string | null>(null); // Base64 image

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [fomoCount, setFomoCount] = useState<string>('');

    useEffect(() => {
        if ((config.type === 'text' || config.type === 'askout') && textareaRef.current) {
            textareaRef.current.focus();
        }
        // Reduced FOMO to a more realistic 50 - 60 range as requested
        setFomoCount((Math.floor(Math.random() * 11) + 50).toString());
    }, [config.type]);

    // ==========================================
    // Media Handlers (Audio & Image)
    // ==========================================
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

                // Cleanup tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = window.setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 60) {
                        stopRecording();
                        return 60;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Mic access denied:', err);
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

    const resetAudio = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Ensure it's an image
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const b64 = reader.result as string;
            setImageStr(b64);
        };
        reader.readAsDataURL(file);
    };

    const triggerImageSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const isSubmitDisabled = () => {
        if (isLoading) return true;
        if (config.type === 'text') return message.trim().length === 0;
        if (config.type === 'askout') return message.trim().length === 0 && !askoutYesNo;
        if (config.type === 'rating') return rating === null;
        if (config.type === 'image') {
            if (slug === 'fit') return rating === null || !imageStr;
            return !imageStr;
        }
        if (config.type === 'audio') return !audioBlob;
        return false;
    };

    // Helper to convert blob to base64 for audio payload
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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
            } else if (config.type === 'audio' && audioBlob) {
                const audioB64 = await blobToBase64(audioBlob);
                payload = { audio_url: audioB64, duration_ms: recordingTime * 1000 };
            } else if (config.type === 'image' && imageStr) {
                payload = { image_url: imageStr, score: rating };
            }

            // -- Device & Location Info (Aura Hints) --
            let locationData: { lat: number, lng: number } | null = null;
            let clientHint = 'desktop user';

            try {
                // Determine explicit device
                const ua = navigator.userAgent || '';
                const platform = navigator.platform || '';

                if (/iphone|ipad|ipod/i.test(ua)) clientHint = 'iPhone user';
                else if (/android/i.test(ua)) clientHint = 'Android user';
                else if (/mac/i.test(platform)) clientHint = 'Mac user';
                else if (/win/i.test(platform)) clientHint = 'Windows user';

                // Try to get location with 4s timeout so we don't block forever
                if (navigator.geolocation) {
                    locationData = await new Promise((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                            () => resolve(null), // On reject (denied/timeout), just proceed without it
                            { timeout: 4000, maximumAge: 60000 }
                        );
                    });
                }
            } catch (err) {
                console.warn("Failed to capture explicit device info", err);
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
                    client_hint: clientHint,
                    location: locationData
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

                    {/* Image Capture / Placeholder specific for 'fit' or 'photo' */}
                    {config.type === 'image' && (
                        <div className="ao-image-capture-wrap">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />

                            {imageStr ? (
                                <div className="ao-image-preview">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageStr} alt="Upload preview" className="ao-preview-img" />
                                    <button className="ao-preview-retake" onClick={(e) => {
                                        e.preventDefault();
                                        setImageStr(null);
                                    }}>
                                        × Remove Image
                                    </button>
                                </div>
                            ) : (
                                <div className="ao-media-stub ao-media-stub-image" onClick={triggerImageSelect}>
                                    <span className="ao-media-icon">📸</span>
                                    <span>Tap to take a photo or upload</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rate Input (Slider for Energy, Chips for Rest, Including Images) */}
                    {(config.type === 'rating' || config.type === 'image') && (
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
                                        id="askout-slider"
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
                                                onClick={(e) => { e.preventDefault(); setRating(n); }}
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

                    {/* Audio Placeholder & Recorder */}
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
                                    <span className={`ao-media-icon ${isRecording ? 'pulse' : ''}`}>
                                        {isRecording ? '🔴' : '🎙️'}
                                    </span>
                                    <span className="ao-recording-time">
                                        {isRecording ? `Recording... 0:${recordingTime.toString().padStart(2, '0')}` : 'Hold to record voice note'}
                                    </span>
                                </button>
                            ) : (
                                <div className="ao-audio-preview">
                                    <audio controls src={audioUrl} className="ao-audio-player" />
                                    <button className="ao-preview-retake" onClick={(e) => {
                                        e.preventDefault();
                                        resetAudio();
                                    }}>
                                        🗑️ Retake
                                    </button>
                                </div>
                            )}
                            <p className="ao-audio-hint">Max 60 seconds</p>
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
                                🔥 {fomoCount} users tapped the button
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
