"use client";

import { useEffect, useState, useRef, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';

// Initialize Supabase correctly from env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type PageProps = {
  params: Promise<{ battleId: string }>;
};

// Strict UUID validator
function isValidUUID(str: string) {
  if (!str || typeof str !== 'string') return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

export default function MogResultPage({ params }: PageProps) {
  const unwrappedParams = typeof (params as any).then === 'function'
    ? use(params as Promise<{ battleId: string }>)
    : params as unknown as { battleId: string };

  const battleId = unwrappedParams.battleId;

  const [loading, setLoading] = useState(true);
  const [battle, setBattle] = useState<any>(null);
  const [defenderData, setDefenderData] = useState<{ username: string; avatar: string | null }>({ username: 'PLAYER 1', avatar: null });
  const [localSnapshot, setLocalSnapshot] = useState<string | null>(null);
  const [localChallengerScore, setLocalChallengerScore] = useState<any>(null);
  const [localDefenderScore, setLocalDefenderScore] = useState<any>(null);

  const [mounted, setMounted] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const snap = sessionStorage.getItem('mog_latest_snapshot');
      if (snap) setLocalSnapshot(snap);
      try {
        const defScore = JSON.parse(sessionStorage.getItem('mog_defender_score') || '{}');
        const chalScore = JSON.parse(sessionStorage.getItem('mog_challenger_score') || '{}');
        setLocalDefenderScore(defScore);
        setLocalChallengerScore(chalScore);
      } catch (e) {}
    }

    async function fetchResult() {
      try {
        const { data: bData, error: bErr } = await supabase
          .from('mog_battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (bErr || !bData) throw new Error("Battle result not found");
        setBattle(bData);

        let finalAvatar = null;
        let finalUsername = bData.challenger_username;
        let targetUuid = bData.challenger_id;

        // SAFEGUARD: If native app stored username in challenger_id, resolve actual UUID first
        if (!isValidUUID(targetUuid)) {
           const { data: askoutUser } = await supabase
             .from('askout_users')
             .select('device_id')
             .eq('slug', targetUuid.toLowerCase())
             .maybeSingle();

           if (askoutUser?.device_id && isValidUUID(askoutUser.device_id)) {
              targetUuid = askoutUser.device_id;
           } else {
             // Fallback: look in profiles
             const { data: userProfile } = await supabase
               .from('profiles')
               .select('user_key, username')
               .eq('username', targetUuid)
               .maybeSingle();
             if (userProfile?.user_key && isValidUUID(userProfile.user_key)) {
                targetUuid = userProfile.user_key;
                finalUsername = userProfile.username;
             }
           }
        }

        // Only query deep image tables if we successfully found a valid UUID
        if (isValidUUID(targetUuid)) {
          // 1. Try public profile
          const { data: pData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_key', targetUuid)
            .maybeSingle();
            
          if (pData?.avatar_url) finalAvatar = pData.avatar_url;
          if (pData?.username) finalUsername = pData.username;

          // 2. Fallback to rate_me_profiles (scan backup)
          if (!finalAvatar) {
            const { data: rmData } = await supabase
              .from('rate_me_profiles')
              .select('last_scan_image_url')
              .eq('anonymous_id', targetUuid)
              .maybeSingle();
            if (rmData?.last_scan_image_url) finalAvatar = rmData.last_scan_image_url;
          }

          // 3. Fallback to user_profiles
          if (!finalAvatar) {
            const { data: upData } = await supabase
              .from('user_profiles')
              .select('avatar_url')
              .eq('user_id', targetUuid)
              .maybeSingle();
            if (upData?.avatar_url) finalAvatar = upData.avatar_url;
          }
        }
        
        setDefenderData({ 
           username: finalUsername?.toUpperCase() || 'PLAYER 1', 
           avatar: finalAvatar 
        });

      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [battleId]);

  useEffect(() => {
    if (!loading && battle) {
      setTimeout(() => setMounted(true), 50);

      const targetP1 = (battle.challenger_score || 0) * 10; 
      const targetP2 = (battle.opponent_score || 0) * 10;   

      // Smooth Apple-like spring animation for scores
      const duration = 1500;
      const steps = 60;
      const interval = duration / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // EaseOutExpo calculation
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        setScores({
          p1: Math.floor(targetP1 * ease),
          p2: Math.floor(targetP2 * ease)
        });

        if (currentStep >= steps) {
          clearInterval(timer);
          setScores({ p1: targetP1, p2: targetP2 });
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [loading, battle]);

  const handleShare = async () => {
    if (!contentRef.current) return;
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#000000',
        scale: 3,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'mog-result.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mog Battle Result',
          text: 'Join the Arena and see if you can mog me on Maxify.'
        });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'mog-result.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Share Error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!battle) {
     return (
        <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
           <p style={{ opacity: 0.5, fontSize: '14px', fontWeight: 500 }}>Battle result not found.</p>
        </div>
     );
  }

  const p1Won = battle.winner_id === battle.challenger_id || battle.winner_id === battle.challenger_username;
  const p2Won = !p1Won;

  const p1Data = {
    name: defenderData.username,
    photo: defenderData.avatar,
    isWinner: p1Won,
    score: scores.p1 / 10
  };

  const p2Data = {
    name: battle.opponent_username?.toUpperCase() || 'PLAYER 2',
    photo: localSnapshot || battle.opponent_image_url || '',
    isWinner: p2Won,
    score: scores.p2 / 10
  };

  const renderCard = (player: any) => {
    const isWinner = player.isWinner;
    
    return (
      <div 
        style={{
          flex: 1,
          backgroundColor: '#0F0F11',
          border: isWinner ? '1.5px solid rgba(0, 255, 255, 0.4)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '32px',
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: '0.64',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.96)',
          transition: 'all 800ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isWinner ? '0 10px 40px rgba(0, 255, 255, 0.15)' : 'none',
        }}
      >
        {/* Photo */}
        {player.photo ? (
          <img 
            src={player.photo} 
            alt={player.name}
            crossOrigin="anonymous"
            style={{
              width: '100%',  
              height: '100%',
              objectFit: 'cover',
              filter: isWinner ? 'contrast(1.05)' : 'grayscale(100%) brightness(0.4) contrast(1.2)',
              backgroundColor: '#0F0F11'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>NO PHOTO</span>
          </div>
        )}

        {/* Clean Apple Glassmorphic Gradient Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          padding: '44px 18px 24px 18px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(2px)', 
          WebkitBackdropFilter: 'blur(2px)',
        }}>
          <span style={{ 
            fontSize: '11px', 
            color: isWinner ? '#00FFFF' : 'rgba(255,255,255,0.5)', 
            letterSpacing: '0.15em', 
            fontWeight: 700, 
            marginBottom: '6px' 
          }}>
            {isWinner ? 'MOGGER' : 'MOGGED'}
          </span>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: '#ffffff', 
            marginBottom: '10px', 
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {player.name}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '44px', 
              fontWeight: 800, 
              color: isWinner ? '#00FFFF' : '#ffffff', 
              lineHeight: 1,
              letterSpacing: '-0.04em'
            }}>
              {player.score.toFixed(1)}
            </span>
            {isWinner && (
              <span style={{ marginLeft: '6px', fontSize: '22px' }}>👑</span>
            )}
          </div>
        </div>

        {/* requested "Black/Red" Stamp */}
        {!isWinner && (
          <div 
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              backgroundColor: '#000000',
              border: '3px solid #FF2D55',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '0.02em',
              zIndex: 10,
              color: '#ffffff',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,45,85,0.2)',
              transform: mounted 
                ? 'translate(-50%, -50%) rotate(-12deg) scale(1)' 
                : 'translate(-50%, -50%) rotate(-12deg) scale(3)',
              opacity: mounted ? 1 : 0,
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.5s, opacity 0.2s ease 0.5s',
            }}
          >
            MOGGED
          </div>
        )}
      </div>
    );
  };

  const renderStatRow = (label: string, p1Val: number, p2Val: number, index: number) => {
    const p1Percent = mounted ? `${(p1Val || 0)}%` : '0%';
    const p2Percent = mounted ? `${(p2Val || 0)}%` : '0%';
    const delay = `${400 + (index * 120)}ms`;

    const activeColor = '#00FFFF';
    const inactiveColor = 'rgba(255,255,255,0.06)';

    return (
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: p1Won ? activeColor : '#ffffff', width: '35px' }}>{Math.floor(p1Val)}</span>
          <span style={{ 
            fontSize: '10px', 
            color: 'rgba(255,255,255,0.4)', 
            letterSpacing: '0.2em', 
            flex: 1, 
            textAlign: 'center', 
            fontWeight: 700 
          }}>
            {label}
          </span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: p2Won ? activeColor : '#ffffff', width: '35px', textAlign: 'right' }}>{Math.floor(p2Val)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '14px' }}>
          {/* P1 bar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: inactiveColor, height: '4px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: p1Won ? activeColor : 'rgba(255,255,255,0.3)',
              width: p1Percent,
              borderRadius: '100px',
              transition: `width 1200ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}`
            }} />
          </div>
          
          {/* P2 bar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', backgroundColor: inactiveColor, height: '4px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: p2Won ? activeColor : 'rgba(255,255,255,0.3)',
              width: p2Percent,
              borderRadius: '100px',
              transition: `width 1200ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}`
            }} />
          </div>
        </div>
      </div>
    );
  };

  const defScores = localDefenderScore || { jawline: 50, eyes: 50, skin: 50, symmetry: 50 };
  const chalScores = localChallengerScore || { jawline: 55, eyes: 55, skin: 55, symmetry: 55 };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', width: '100%', fontFamily: 'Inter, -apple-system, system-ui, sans-serif', color: '#fff', display: 'flex', justifyContent: 'center' }}>
      
      {/* PHONE UI CONTAINER */}
      <div style={{ maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        <div ref={contentRef} style={{ padding: '0 24px', backgroundColor: '#000' }}>
          
          <div style={{ paddingTop: '28px', marginBottom: '32px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.35em', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
              MOG BATTLE RESULT
            </span>
          </div>

          <div style={{ display: 'flex', gap: '14px', marginBottom: '32px' }}>
            {renderCard(p1Data)}
            {renderCard(p2Data)}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 800, 
              color: '#00FFFF', 
              letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(0,255,255,0.2)'
            }}>
              WINNER: {p1Won ? p1Data.name : p2Data.name}
            </span>
          </div>

          <div style={{ padding: '0 4px' }}>
            {renderStatRow('JAWLINE', defScores.jawline, chalScores.jawline, 0)}
            {renderStatRow('EYES', defScores.eyes, chalScores.eyes, 1)}
            {renderStatRow('SKIN', defScores.skin, chalScores.skin, 2)}
            {renderStatRow('SYMMETRY', defScores.symmetry, chalScores.symmetry, 3)}
          </div>
        </div>

        {/* Buttons Section */}
        <div style={{ padding: '36px 24px 60px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => window.location.href = `/mog/battle/${battle.challenger_username}`}
            style={{
              height: '56px',
              width: '100%',
              background: 'linear-gradient(135deg, #1C1C1E 0%, #151517 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.03em',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            }}
          >
            FIGHT AGAIN
          </button>

          <button 
            onClick={handleShare}
            style={{
              height: '56px',
              width: '100%',
               backgroundColor: '#fff',
               color: '#000',
              fontSize: '15px',
              fontWeight: 800,
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.03em',
            }}
          >
            SHARE RESULT
          </button>
        </div>
      </div>
    </div>
  );
}
