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

  const handleOpenApp = () => {
    // Universal/Deep Link for the BattleAcceptScreen
    window.location.href = `maxify://battle/mogbattle/${userId}`;
    // Fallback/Backup for desktop or non-app users
    setTimeout(() => {
       // Optional: Notify user or open app store if needed
    }, 2500);
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100dvh', width: '100%', display: 'flex', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      
      {/* PHONE UI CONTAINER */}
      <div style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>
        
        {/* Toast Notification */}
        {toastMessage && (
          <div style={{ position: 'absolute', top: '96px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#fff', color: '#000', padding: '12px 24px', borderRadius: '100px', fontSize: '11px', fontWeight: 900, zIndex: 50, whiteSpace: 'nowrap', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'Syne' }}>
            {toastMessage}
          </div>
        )}

        {/* Top bar */}
        <div style={{ paddingTop: '52px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px', zIndex: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <button 
            onClick={() => router.back()} 
            style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '100px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        </div>

        {/* Header Title */}
        <div style={{ textAlign: 'center', padding: '0 24px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Syne', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            ARE YOU<br/><span style={{ color: '#FF2D55' }}>MOGGING?</span>
          </h1>
        </div>

        {/* Image Preview Area */}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
            {selectedImage ? (
              <div style={{ width: '100%', aspectRatio: '3/4', position: 'relative', borderRadius: '24px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                  <img src={selectedImage} alt="Selection" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: 0.3 }}>
                   <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                       <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                       <circle cx="8.5" cy="8.5" r="1.5"></circle>
                       <polyline points="21 15 16 10 5 21"></polyline>
                   </svg>
                   <p style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'Syne', letterSpacing: '0.02em' }}>UPLOAD A PHOTO TO<br/>START THE MOG BATTLE</p>
               </div>
            )}
        </div>

        {/* Bottom Sheet Actions */}
        <div style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px 24px 48px 24px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
           
           {/* Handle */}
           <div style={{ width: '48px', height: '6px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '100px', alignSelf: 'center', marginBottom: '12px' }} />

           {!selectedImage ? (
              <>
                 <button 
                   onClick={() => cameraInputRef.current?.click()}
                   style={{ width: '100%', backgroundColor: '#fff', color: '#000', borderRadius: '16px', padding: '20px', fontWeight: 800, fontSize: '17px', fontFamily: 'Syne', border: 'none', cursor: 'pointer' }}
                 >
                   TAKE PHOTO
                 </button>
                 <input type="file" accept="image/*" capture="user" ref={cameraInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

                 <button 
                   onClick={() => galleryInputRef.current?.click()}
                   style={{ width: '100%', backgroundColor: '#2C2C2E', color: '#fff', borderRadius: '16px', padding: '20px', fontWeight: 800, fontSize: '17px', fontFamily: 'Syne', border: 'none', cursor: 'pointer' }}
                 >
                   PHOTO LIBRARY
                 </button>
                 <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

                 {/* APP CTA */}
                 <button 
                   onClick={handleOpenApp}
                   style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: '16px', padding: '16px', fontWeight: 800, fontSize: '14px', fontFamily: 'Syne', cursor: 'pointer', marginTop: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                 >
                   BATTLE IN MAXIFY APP 🔥
                 </button>
              </>
           ) : (
              <>
                 <button 
                   onClick={handleBattleNow}
                   disabled={isCapturing || isLoadingModels}
                   style={{ width: '100%', backgroundColor: '#fff', color: '#000', borderRadius: '16px', padding: '20px', fontWeight: 900, fontSize: '19px', fontFamily: 'Syne', border: 'none', cursor: 'pointer', opacity: (isCapturing || isLoadingModels) ? 0.5 : 1 }}
                 >
                   {isCapturing ? "ANALYZING..." : "BATTLE NOW ⚔️"}
                 </button>

                 <button 
                   onClick={() => setSelectedImage(null)}
                   disabled={isCapturing}
                   style={{ width: '100%', color: 'rgba(255,255,255,0.4)', padding: '12px', fontWeight: 800, fontSize: '13px', fontFamily: 'Syne', border: 'none', background: 'none', cursor: 'pointer', opacity: isCapturing ? 0.2 : 1 }}
                 >
                   RETAKE PHOTO
                 </button>
              </>
           )}
        </div>

      </div>
    </div>
  );
}
