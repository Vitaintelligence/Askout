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
    battleResult
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
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>
      )}

      {/* Top bar overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer', padding: 0 }}
        >
          ←
        </button>
        <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em' }}>
          MOG BATTLE
        </span>
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
        <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
          
          {isCapturing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
              <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 500 }}>Analyzing...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button 
              onClick={handleCaptureTap}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                backgroundColor: 'transparent',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
            </button>
          )}
          
        </div>
      )}
    </div>
  );
}
