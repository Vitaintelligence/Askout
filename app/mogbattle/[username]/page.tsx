"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
 // No custom font, keep it corporate

export default function MogBattleSharePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const resolvedParams = use(params);
    const username = resolvedParams.username;
    const [mounted, setMounted] = useState(false);

    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleAcceptChallenge = () => {
        router.push(`/mog/battle/${username}`);
    };

    if (!mounted) return null;

    return (
        <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center overflow-hidden relative font-sans selection:bg-[#FF2D75] selection:text-white">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-gradient-to-b from-[#FF2D75]/20 to-transparent blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[40vh] bg-gradient-to-t from-[#FF2D75]/10 to-transparent blur-[80px] pointer-events-none" />

            {/* Main Container */}
            <div className="relative z-10 w-full max-w-sm px-6 py-12 flex flex-col items-center justify-between min-h-[100dvh]">

                {/* Top Branding */}
                <div className="flex flex-col items-center gap-2 animate-fade-in-down mt-4">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#FF2D75]">
                            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
                            <line x1="13" y1="19" x2="19" y2="13"></line>
                            <line x1="16" y1="16" x2="20" y2="20"></line>
                            <line x1="19" y1="21" x2="21" y2="19"></line>
                        </svg>
                        <span className="text-xs font-bold tracking-wider uppercase text-white/80">
                            Live Challenge
                        </span>
                    </div>
                </div>

                {/* Central Content */}
                <div className="w-full flex flex-col items-center my-auto pt-8 animate-zoom-in">
                    {/* Avatar / Visual Placeholder */}
                    <div className="relative mb-8 group style-perspective" style={{ perspective: '1000px' }}>
                        <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-[#FF2D75]/30 shadow-[0_0_40px_rgba(255,45,117,0.4)] animate-float">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2D75] to-purple-800 opacity-80" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-5xl font-bold uppercase mix-blend-overlay">
                                {username.charAt(0)}
                            </div>
                        </div>

                        {/* Pulsing ring */}
                        <div className="absolute inset-0 rounded-full border border-[#FF2D75] opacity-50 animate-ping-slow" />
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-black text-center leading-tight tracking-tight mb-4 lowercase drop-shadow-[0_4px_24px_rgba(255,45,117,0.3)] animate-fade-in-up">
                        <span className="text-[#FF2D75] uppercase text-5xl sm:text-6xl">{username}</span>
                        <br />
                        wants to battle
                    </h1>

                    <p className="text-center text-white/60 font-medium max-w-[280px] mb-8 animate-fade-in-up delay-200">
                        Who mogs who? Accept the challenge to prove your spot on the leaderboard.
                    </p>
                </div>

                {/* Action Button */}
                <div className="w-full mt-auto pb-4 animate-slide-up-fade">
                    <button
                        onClick={handleAcceptChallenge}
                        className="relative w-full group overflow-hidden rounded-full p-[2px]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FF2D75] via-purple-500 to-[#FF2D75] opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-x bg-[length:200%_auto]" />
                        <div className="relative flex items-center justify-center gap-3 w-full bg-black/80 backdrop-blur-xl rounded-full px-8 py-4 border border-white/10 group-hover:bg-black/60 transition-colors duration-300">
                            <span className="font-bold text-lg tracking-wide text-white">ACCEPT CHALLENGE</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#FF2D75] group-hover:scale-110 transition-transform block">
                                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
                                <line x1="13" y1="19" x2="19" y2="13"></line>
                                <line x1="16" y1="16" x2="20" y2="20"></line>
                                <line x1="19" y1="21" x2="21" y2="19"></line>
                            </svg>
                        </div>
                    </button>

                    <p className="text-center text-xs text-white/40 mt-6 flex items-center justify-center gap-2">
                        Runs entirely in your <span className="font-bold text-white/80">Browser</span>
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
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoom-in {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up-fade {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-fade-in-down { animation: fade-in-down 0.6s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        .animate-zoom-in { animation: zoom-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-slide-up-fade { animation: slide-up-fade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .delay-200 { animation-delay: 200ms; }
      `}} />
        </div>
    );
}
