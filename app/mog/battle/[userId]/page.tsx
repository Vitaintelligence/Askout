"use client";

import { useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMogBattle } from '@/src/hooks/useMogBattle';

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default function MogBattlePage({ params }: PageProps) {
  const unwrappedParams = typeof (params as any).then === 'function'
    ? use(params as Promise<{ userId: string }>)
    : params as unknown as { userId: string };

  const userId = unwrappedParams.userId;
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isLoadingModels,
    isCapturing,
    error: cameraError,
    toastMessage,
    videoRef,
    capture,
    battleResult,
    challengerAvatarUrl
  } = useMogBattle(userId);

  useEffect(() => {
    if (battleResult) {
      router.push(`/mog/result/${battleResult}`);
    }
  }, [battleResult, router]);

  const handleCaptureTap = () => {
    if (videoRef.current) {
      capture(videoRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => capture(img);
      img.src = URL.createObjectURL(file);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#09090B] overflow-hidden font-sans flex flex-col justify-between">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-[96px] left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full text-xs font-bold z-50 whitespace-nowrap shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Camera Video Stream */}
      {!cameraError ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#09090B] z-10 relative">
          <p className="text-white text-sm mb-6 text-center font-medium">Camera access required to battle.</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-8 py-3.5 rounded-full text-sm font-bold active:scale-95 transition-transform"
          >
            Try uploading instead
          </button>
          <input 
            type="file" 
            accept="image/*" 
            capture="user"
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      )}

      {/* Top bar overlay (Clean Apple Aesthetic) */}
      <div className="absolute top-0 inset-x-0 pt-[52px] pb-6 px-6 z-30 flex justify-between items-start pointer-events-none">
        
        {/* Back Button */}
        <button 
          onClick={() => router.back()} 
          className="w-12 h-12 flex items-center justify-center rounded-full bg-black/40 border border-white/10 text-white active:scale-95 transition-transform pointer-events-auto"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>

        {/* Floating Opponent Avatar Card */}
        <div className="flex flex-col items-center relative gap-1 pointer-events-auto">
          <div className="px-4 py-1.5 rounded-full bg-black/40 border border-white/10">
             <span className="text-white text-[10px] font-black tracking-[0.2em] uppercase">Mog Battle</span>
          </div>
          {challengerAvatarUrl ? (
            <div className="relative w-16 h-20 rounded-[18px] overflow-hidden border border-white/10 bg-black">
               <img 
                 src={challengerAvatarUrl} 
                 alt="Challenger" 
                 className="w-full h-full object-cover"
               />
            </div>
          ) : (
            <div className="relative w-16 h-20 rounded-[18px] overflow-hidden border border-white/10 bg-black flex items-center justify-center">
               <span className="text-white/30 text-[10px] font-bold">VS</span>
            </div>
          )}
        </div>
        
        {/* Placeholder for flex balance */}
        <div className="w-12"></div>
      </div>

      {/* Face guide overlay (Clean Face ID style) */}
      {!cameraError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-[280px] h-[50%] max-h-[400px] border-[1.5px] border-dashed border-white/40 rounded-[100px] pointer-events-none z-10" />
      )}

      {/* Bottom bar overlay */}
      {!cameraError && (
        <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-10 z-30 px-8">
          
          {/* Gallery Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex justify-center items-center active:scale-95 transition-transform text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <input 
            type="file" 
            accept="image/*" 
            capture="user"
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          {/* Capture Button (Native Apple Feel) */}
          {isCapturing ? (
            <div className="w-20 h-20 rounded-full border-[3px] border-[#FF2D75] flex justify-center items-center transition-all bg-black/20">
              <div className="w-6 h-6 rounded-[4px] bg-[#FF2D75]" />
            </div>
          ) : (
            <button 
              onClick={handleCaptureTap}
              className="w-20 h-20 rounded-full border-[3px] border-white flex justify-center items-center active:scale-95 transition-transform bg-black/10"
            >
              <div className="w-[66px] h-[66px] rounded-full bg-white" />
            </button>
          )}

          {/* Empty spacer to balance the flex layout */}
          <div className="w-12 h-12" />
          
        </div>
      )}
    </div>
  );
}
