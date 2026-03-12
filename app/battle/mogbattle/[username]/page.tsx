"use client";

import { use, useEffect, useState } from "react";
import { Permanent_Marker } from "next/font/google";

const craftyFont = Permanent_Marker({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});

export default function MogBattlePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const resolvedParams = use(params);
    const username = resolvedParams.username;
    const [mounted, setMounted] = useState(false);
    const [opening, setOpening] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleAcceptChallenge = () => {
        setOpening(true);
        // Universal Link — opens Maxify app directly on iOS/Android
        window.location.href = `https://askout.link/battle/mogbattle/${username}`;
        // Fallback after 2.5s: send to App Store
        setTimeout(() => {
            window.location.href = "https://apps.apple.com/app/maxify";
        }, 2500);
    };

    if (!mounted) return null;

    return (
        <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center overflow-hidden relative font-sans selection:bg-[#00FFCC] selection:text-black">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-gradient-to-b from-[#00FFCC]/15 to-transparent blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[40vh] bg-gradient-to-t from-[#AA00FF]/10 to-transparent blur-[80px] pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm px-6 py-12 flex flex-col items-center justify-between min-h-[100dvh]">

                {/* Live Challenge pill */}
                <div className="flex flex-col items-center gap-2 mt-4">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[#00FFCC]/20 backdrop-blur-md">
                        <span className="text-[#00FFCC] text-xs">⚔️</span>
                        <span className="text-xs font-bold tracking-widest uppercase text-[#00FFCC]/80">
                            MOG BATTLE
                        </span>
                    </div>
                </div>

                {/* Avatar + Name */}
                <div className="w-full flex flex-col items-center my-auto pt-8">
                    {/* Avatar ring */}
                    <div className="relative mb-8">
                        <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-[#00FFCC]/40 shadow-[0_0_60px_rgba(0,255,204,0.35)] animate-float">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00FFCC]/30 to-[#AA00FF]/40" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-6xl font-black uppercase text-white mix-blend-overlay select-none">
                                {username.charAt(0)}
                            </div>
                        </div>
                        {/* Pulsing ring */}
                        <div className="absolute inset-0 rounded-full border border-[#00FFCC]/40 opacity-60 animate-ping-slow" />
                    </div>

                    <h1 className={`text-4xl sm:text-5xl font-black text-center leading-tight tracking-tight mb-4 ${craftyFont.className}`}>
                        <span className="text-[#00FFCC] uppercase text-5xl sm:text-6xl">{username}</span>
                        <br />
                        <span className="text-white">wants to mog you</span>
                    </h1>

                    <p className="text-center text-white/50 font-medium max-w-[280px] mb-2 text-sm leading-relaxed">
                        Who&apos;s the alpha? Accept the mog battle and let the AI decide.
                    </p>

                    {/* Score teaser pills */}
                    <div className="flex items-center gap-2 mt-4">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40 font-mono">? . ?</span>
                        <span className="text-white/30 font-black text-lg">vs</span>
                        <span className="px-3 py-1 rounded-full bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-xs text-[#00FFCC] font-mono font-black">YOU</span>
                    </div>
                </div>

                {/* CTA */}
                <div className="w-full mt-auto pb-4">
                    <button
                        onClick={handleAcceptChallenge}
                        disabled={opening}
                        className="relative w-full group overflow-hidden rounded-full p-[2px] disabled:opacity-70"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00FFCC] via-[#AA00FF] to-[#00FFCC] opacity-80 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-x bg-[length:200%_auto]" />
                        <div className="relative flex items-center justify-center gap-3 w-full bg-black/80 backdrop-blur-xl rounded-full px-8 py-5 border border-white/10 group-hover:bg-black/60 transition-colors duration-300">
                            <span className="font-black text-lg tracking-wide text-white">
                                {opening ? "OPENING APP…" : "ACCEPT THE MOG ⚔️"}
                            </span>
                        </div>
                    </button>

                    <p className="text-center text-xs text-white/30 mt-5">
                        Requires the <span className="font-bold text-white/60">Maxify App</span>
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}} />
        </div>
    );
}
