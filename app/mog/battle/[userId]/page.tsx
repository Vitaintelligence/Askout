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
    <div style={{ backgroundColor: '#000000', position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'absolute', top: '72px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', padding: '12px 24px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, zIndex: 50, whiteSpace: 'nowrap' }}>
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
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <p style={{ color: '#ffffff', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
            Camera access required to battle.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ backgroundColor: '#ffffff', color: '#000000', padding: '16px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}
          >
            Try uploading instead
          </button>
          <input 
            type="file" 
            accept="image/*" 
            capture="user"
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>
      )}

      {/* Top bar overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer', padding: 0 }}
        >
          ←
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 800, letterSpacing: '0.15em', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            MOG BATTLE
          </span>
          {challengerAvatarUrl && (
            <div style={{
              width: '64px',
              height: '80px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #FF2D75', // Brand theme border
              boxShadow: '0 4px 12px rgba(255, 45, 117, 0.4)'
            }}>
              <img 
                src={challengerAvatarUrl} 
                alt="Challenger" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
        
        <div style={{ width: '24px' }} /* Placeholder for spacing */ />
      </div>

      {/* Face guide overlay */}
      {!cameraError && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          width: '60%',
          maxWidth: '280px',
          height: '50%',
          maxHeight: '400px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '50% / 40%', // Oval shape
          pointerEvents: 'none',
          zIndex: 10
        }} />
      )}

      {/* Bottom bar overlay */}
      {!cameraError && (
        <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', zIndex: 10 }}>
          
          {/* Gallery Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
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
            style={{ display: 'none' }} 
          />

          {isCapturing ? (
            <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#FF2D75', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 500 }}>Scanning</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button 
              onClick={handleCaptureTap}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '4px solid #ffffff',
                backgroundColor: 'transparent',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 0 20px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                backgroundColor: '#FF2D75', // Brand blossom/reddish-orangish 
                background: 'linear-gradient(135deg, #FF2D75 0%, #FF4B2B 100%)'
              }} />
            </button>
          )}

          {/* Empty spacer to balance the flex layout */}
          <div style={{ width: '48px', height: '48px' }} />
          
        </div>
      )}
    </div>
  );
}
