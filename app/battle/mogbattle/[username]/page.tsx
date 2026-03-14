"use client";

import { use, useEffect, useState } from "react";
import { Permanent_Marker } from "next/font/google";

const craftyFont = Permanent_Marker({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

type Step = "challenge" | "guide";

export default function MogBattlePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = use(params);
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>("challenge");
    const [ticking, setTicking] = useState(false);

    useEffect(() => setMounted(true), []);

    const handleAcceptChallenge = () => {
        setTicking(true);

        // Detect platform
        const ua = navigator.userAgent;
        const isAndroid = /android/i.test(ua);
        const isIOS = /iphone|ipad|ipod/i.test(ua);

        // Custom scheme URI — works from JS in Safari and Chrome
        const customScheme = `maxify://battle/mogbattle/${username}`;

        // Android intent:// format — most reliable on Android Chrome
        const intentUri =
            `intent://battle/mogbattle/${username}#Intent;` +
            `scheme=maxify;` +
            `package=com.rizzify.rizzify;` +
            `S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.rizzify.rizzify;` +
            `end`;

        if (isAndroid) {
            window.location.href = intentUri;
        } else {
            // iOS & desktop: try custom scheme, fall back to guide after 1.8s
            window.location.href = customScheme;
        }

        // If still on page after 1.8s → app not installed, show download guide
        setTimeout(() => {
            if (document.hidden) {
                setTicking(false);
                return; // app opened — tab was backgrounded
            }
            setStep("guide");
            setTicking(false);
        }, 1800);
    };

    if (!mounted) return null;

    // ─── GUIDE STEP ────────────────────────────────────────────────────────────
    if (step === "guide") {
        return (
            <div className="min-h-[100dvh] bg-[#09090B] text-white flex flex-col items-center justify-center px-6 font-sans">
                <div className="w-full max-w-sm flex flex-col gap-8">

                    {/* Header */}
                    <div className="text-center">
                        <p className="text-xs font-bold tracking-[0.25em] uppercase text-white/30 mb-3">To accept this battle</p>
                        <h1 className={`text-4xl font-black text-white leading-tight ${craftyFont.className}`}>
                            2 quick steps
                        </h1>
                    </div>

                    {/* Steps */}
                    {[
                        {
                            n: "1",
                            icon: "⬇️",
                            title: "Download Maxify",
                            sub: "The app where all battles happen. Free.",
                            cta: "Get Maxify on the App Store",
                            href: "https://apps.apple.com/us/app/maxify-rate-me-ai/id6743714386",
                        },
                        {
                            n: "2",
                            icon: "⚔️",
                            title: "Tap this link again",
                            sub: "Once installed, come back and tap ACCEPT THE MOG. The app will open straight to the battle.",
                            cta: null,
                            href: null,
                        },
                    ].map((s) => (
                        <div key={s.n} className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-xl">
                                {s.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-white text-base leading-tight mb-1">{s.title}</p>
                                <p className="text-white/40 text-sm leading-relaxed">{s.sub}</p>
                                {s.cta && (
                                    <a
                                        href={s.href!}
                                        className="inline-block mt-3 px-5 py-2.5 bg-white text-black font-black text-sm rounded-full"
                                    >
                                        {s.cta} →
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Divider */}
                    <div className="h-px bg-white/5" />

                    {/* Re-try CTA */}
                    <button
                        onClick={handleAcceptChallenge}
                        className="w-full py-4 rounded-full bg-white text-black font-black text-base tracking-wide"
                    >
                        I have it — open the app ⚔️
                    </button>

                    <p className="text-center text-xs text-white/20">
                        Challenge by <span className="text-white/50 font-bold">{username}</span>
                    </p>
                </div>
            </div>
        );
    }

    // ─── CHALLENGE STEP ────────────────────────────────────────────────────────
    return (
        <div className="min-h-[100dvh] bg-[#09090B] text-white flex flex-col font-sans overflow-hidden">

            {/* Subtle top edge glow — NOT full screen gradient */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative z-10 flex flex-col items-center justify-between min-h-[100dvh] px-6 py-12 max-w-sm mx-auto w-full">

                {/* Live pill */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] shadow-[0_0_8px_#00FFCC] inline-block animate-pulse" />
                    <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">
                        Live Challenge
                    </span>
                </div>

                {/* Main content */}
                <div className="flex flex-col items-center text-center gap-6 my-auto">

                    {/* Avatar initials block */}
                    <div className="relative">
                        <div className="w-28 h-28 rounded-[32px] bg-white/[0.04] border border-white/10 flex items-center justify-center">
                            <span className={`text-5xl font-black text-white uppercase ${craftyFont.className}`}>
                                {username.charAt(0)}
                            </span>
                        </div>
                        {/* Teal dot badge */}
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00FFCC] border-2 border-[#09090B] flex items-center justify-center">
                            <span className="text-[8px] font-black text-black">⚔</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Mog Battle</p>
                        <h1 className={`text-[42px] leading-none font-black text-white mb-3 ${craftyFont.className}`}>
                            {username}
                            <br />
                            <span className="text-white/40 text-3xl">wants to mog you</span>
                        </h1>
                        <p className="text-white/35 text-sm leading-relaxed max-w-[240px] mx-auto">
                            Submit your best scan. The AI decides who&apos;s the alpha.
                        </p>
                    </div>

                    {/* Score tease */}
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                            <p className="text-xs text-white/30 font-medium mb-0.5">Challenger</p>
                            <p className="font-black text-white font-mono text-lg">?·?</p>
                        </div>
                        <span className="text-2xl font-black text-white/20">vs</span>
                        <div className="px-4 py-2 rounded-2xl bg-[#00FFCC]/[0.06] border border-[#00FFCC]/20">
                            <p className="text-xs text-[#00FFCC]/50 font-medium mb-0.5">You</p>
                            <p className="font-black text-[#00FFCC] font-mono text-lg">—·—</p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="w-full space-y-3">
                    <button
                        onClick={handleAcceptChallenge}
                        disabled={ticking}
                        className="w-full py-5 rounded-2xl bg-white text-black font-black text-base tracking-wide disabled:opacity-60 transition-all active:scale-[0.98]"
                    >
                        {ticking ? "Opening app…" : "ACCEPT THE MOG ⚔️"}
                    </button>
                    <p className="text-center text-xs text-white/20">
                        Requires the <span className="text-white/40 font-semibold">Maxify App</span> · Free on{" "}
                        <a href="https://apps.apple.com/us/app/maxify-rate-me-ai/id6743714386" className="text-white/40 underline">iOS</a>
                        {" "}&amp;{" "}
                        <a href="https://play.google.com/store/apps/details?id=com.maxify.app" className="text-white/40 underline">Android</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
