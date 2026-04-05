"use client";

import { useEffect, useRef, useState, use } from 'react';
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    isLoadingModels,
    isCapturing,
    toastMessage,
    capture,
    battleResult,
  } = useMogBattle(userId);

  useEffect(() => {
    if (battleResult) {
      router.push(`/mog/result/${battleResult}`);
    }
  }, [battleResult, router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear value so the same file can be selected again if needed
      e.target.value = '';
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const handleBattleNow = () => {
    if (!selectedImage || isCapturing || isLoadingModels) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => capture(img);
    img.src = selectedImage;
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#09090B] overflow-hidden font-sans flex flex-col justify-between">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-[96px] left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full text-xs font-bold z-50 whitespace-nowrap shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Top bar overlay */}
      <div className="absolute top-0 inset-x-0 pt-[52px] pb-6 px-6 z-30 flex justify-between items-start pointer-events-none">
        <button 
          onClick={() => router.back()} 
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white active:scale-95 pointer-events-auto"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
      </div>

      {/* Image Preview Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center mt-[100px] mb-[200px] px-8 relative">
          {selectedImage ? (
            <div className="w-full h-full max-h-[500px] relative rounded-3xl overflow-hidden border-2 border-white/10">
                <img src={selectedImage} alt="Selection" className="w-full h-full object-cover" />
            </div>
          ) : (
             <div className="flex flex-col items-center text-center opacity-40">
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4">
                     <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                     <circle cx="8.5" cy="8.5" r="1.5"></circle>
                     <polyline points="21 15 16 10 5 21"></polyline>
                 </svg>
                 <p className="text-sm font-semibold">Select an image or take a photo<br/>to start the Mog Battle</p>
             </div>
          )}
      </div>

      {/* Solid Apple iOS-style Bottom Sheet Actions */}
      <div className="absolute bottom-0 inset-x-0 bg-[#1C1C1E] rounded-t-[32px] p-6 pb-[env(safe-area-inset-bottom,32px)] flex flex-col gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
         
         <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2" />

         {!selectedImage ? (
            <>
               <button 
                 onClick={() => cameraInputRef.current?.click()}
                 className="w-full bg-white text-black rounded-2xl py-4 font-bold text-lg active:scale-[0.98] transition-transform"
               >
                 Take Photo
               </button>
               <input 
                 type="file" 
                 accept="image/*" 
                 capture="user"
                 ref={cameraInputRef} 
                 onChange={handleFileUpload} 
                 className="hidden" 
               />

               <button 
                 onClick={() => galleryInputRef.current?.click()}
                 className="w-full bg-[#2C2C2E] text-white rounded-2xl py-4 font-bold text-lg active:scale-[0.98] transition-transform"
               >
                 Photo Library
               </button>
               <input 
                 type="file" 
                 accept="image/*" 
                 ref={galleryInputRef} 
                 onChange={handleFileUpload} 
                 className="hidden" 
               />
            </>
         ) : (
            <>
               <button 
                 onClick={handleBattleNow}
                 disabled={isCapturing || isLoadingModels}
                 className="w-full bg-white text-black rounded-2xl py-4 font-black text-xl tracking-tight active:scale-[0.98] transition-transform disabled:opacity-50 flex justify-center items-center gap-2"
               >
                 {isCapturing ? "ANALYZING..." : "BATTLE NOW ⚔️"}
               </button>

               <button 
                 onClick={() => setSelectedImage(null)}
                 disabled={isCapturing}
                 className="w-full text-white/50 py-3 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-20"
               >
                 Retake
               </button>
            </>
         )}
      </div>

    </div>
  );
}
