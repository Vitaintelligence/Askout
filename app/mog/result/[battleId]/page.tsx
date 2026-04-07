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

  // Animation states
  const [mounted, setMounted] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get snapshot from session storage
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
        // Fetch battle result from DB
        const { data: bData, error: bErr } = await supabase
          .from('mog_battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (bErr || !bData) throw new Error("Battle result not found");
        
        setBattle(bData);

        // --- CASCADING PHOTO LOOKUP FOR DEFENDER (Link Owner) ---
        // 1. Try public profile
        const { data: pData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('user_key', bData.challenger_id)
          .single();
          
        let finalAvatar = pData?.avatar_url;
        let finalUsername = pData?.username || bData.challenger_username;

        // 2. Fallback to rate_me_profiles (scan backup)
        if (!finalAvatar) {
          const { data: rmData } = await supabase
            .from('rate_me_profiles')
            .select('last_scan_image_url')
            .eq('anonymous_id', bData.challenger_id)
            .single();
          if (rmData?.last_scan_image_url) finalAvatar = rmData.last_scan_image_url;
        }

        // 3. Last resort fallback to user_profiles
        if (!finalAvatar) {
          const { data: upData } = await supabase
            .from('user_profiles')
            .select('avatar_url')
            .eq('user_id', bData.challenger_id)
            .single();
          if (upData?.avatar_url) finalAvatar = upData.avatar_url;
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

  // Entrance animations
  useEffect(() => {
    if (!loading && battle) {
      setTimeout(() => setMounted(true), 100);

      const targetP1 = (battle.challenger_score || 0) * 10; 
      const targetP2 = (battle.opponent_score || 0) * 10;   

      // Animate scores counting up
      const duration = 1200; // Slower, more "brutal" build up
      const steps = 60;
      const interval = duration / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress); // easeOutExpo
        
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
          text: 'Join the Arena and get Mogged'
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
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,45,85,0.3)', borderTopColor: '#FF2D55', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!battle) return null;

  // P1 = Defender (link owner), P2 = Challenger (web camera)
  const p1Won = battle.winner_id === battle.challenger_id;
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
          backgroundColor: '#000',
          border: isWinner ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: '0.64',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 700ms cubic-bezier(0.19, 1, 0.22, 1)',
          boxShadow: isWinner ? '0 0 40px rgba(255,215,0,0.1)' : 'none',
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
              filter: isWinner ? 'none' : 'grayscale(100%) brightness(0.6)',
              backgroundColor: '#131316'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, fontFamily: 'Syne' }}>PHOTO MISSING</span>
          </div>
        )}

        {/* Text Fade Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          padding: '40px 16px 20px 16px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span style={{ 
            fontSize: '10px', 
            fontFamily: 'Syne',
            color: isWinner ? '#FFD700' : 'rgba(255,255,255,0.4)', 
            letterSpacing: '0.2em', 
            fontWeight: 800, 
            marginBottom: '4px' 
          }}>
            {isWinner ? 'MOGGER' : 'MOGGED'}
          </span>
          <span style={{ 
            fontSize: '16px', 
            fontFamily: 'Syne',
            fontWeight: 800, 
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
              fontFamily: 'Syne',
              fontWeight: 800, 
              color: isWinner ? '#FFD700' : '#ffffff', 
              lineHeight: 1,
              letterSpacing: '-0.05em'
            }}>
              {player.score.toFixed(1)}
            </span>
            {isWinner && (
              <span style={{ marginLeft: '6px', fontSize: '20px' }}>🏆</span>
            )}
          </div>
        </div>

        {/* "MOGGED" Stamp - Brutalist Style */}
        {!isWinner && (
          <div 
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              backgroundColor: '#000000',
              border: '3px solid #FF2D55',
              padding: '10px 18px',
              borderRadius: '2px',
              fontSize: '24px',
              fontWeight: 800,
              fontFamily: 'Syne',
              letterSpacing: '0.05em',
              zIndex: 10,
              color: '#ffffff',
              boxShadow: '0 0 40px rgba(255,45,85,0.3)',
              transform: mounted 
                ? 'translate(-50%, -50%) rotate(-12deg) scale(1)' 
                : 'translate(-50%, -50%) rotate(-12deg) scale(4)',
              opacity: mounted ? 1 : 0,
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s, opacity 0.2s ease 0.6s',
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
    const inactiveColor = '#1A1A1E';

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px', fontFamily: 'Syne', fontWeight: 800, color: p1Won ? activeColor : '#ffffff', width: '35px' }}>{Math.floor(p1Val)}</span>
          <span style={{ 
            fontSize: '9px', 
            fontFamily: 'Syne',
            color: 'rgba(255,255,255,0.3)', 
            letterSpacing: '0.25em', 
            flex: 1, 
            textAlign: 'center', 
            fontWeight: 800 
          }}>
            {label}
          </span>
          <span style={{ fontSize: '16px', fontFamily: 'Syne', fontWeight: 800, color: p2Won ? activeColor : '#ffffff', width: '35px', textAlign: 'right' }}>{Math.floor(p2Val)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* P1 bar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: inactiveColor, height: '5px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: p1Won ? activeColor : 'rgba(255,255,255,0.1)',
              width: p1Percent,
              transition: `width 1000ms cubic-bezier(0.19, 1, 0.22, 1) ${delay}`
            }} />
          </div>
          
          {/* P2 bar */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', backgroundColor: inactiveColor, height: '5px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: p2Won ? activeColor : 'rgba(255,255,255,0.1)',
              width: p2Percent,
              transition: `width 1000ms cubic-bezier(0.19, 1, 0.22, 1) ${delay}`
            }} />
          </div>
        </div>
      </div>
    );
  };

  const defScores = localDefenderScore || { jawline: 50, eyes: 50, skin: 50, symmetry: 50 };
  const chalScores = localChallengerScore || { jawline: 55, eyes: 55, skin: 55, symmetry: 55 };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', width: '100%', fontFamily: "'Outfit', sans-serif", color: '#fff', display: 'flex', justifyContent: 'center' }}>
      
      {/* PHONE UI CONTAINER */}
      <div style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Screenshot Content container */}
        <div ref={contentRef} style={{ padding: '0 20px', backgroundColor: '#000' }}>
          
          {/* Header */}
          <div style={{ paddingTop: '32px', marginBottom: '32px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontFamily: 'Syne', letterSpacing: '0.4em', fontWeight: 800, opacity: 0.6 }}>
              MOG BATTLE RESULT
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {renderCard(p1Data)}
            {renderCard(p2Data)}
          </div>

          {/* Winner Teal Text */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ 
              fontSize: '20px', 
              fontFamily: 'Syne',
              fontWeight: 800, 
              color: '#00FFFF', 
              letterSpacing: '0.05em',
              textShadow: '0 0 25px rgba(0,255,255,0.4)'
            }}>
              WINNER: {p1Won ? p1Data.name : p2Data.name}
            </span>
          </div>

          {/* Attributes */}
          <div style={{ padding: '0 10px' }}>
            {renderStatRow('JAWLINE', defScores.jawline, chalScores.jawline, 0)}
            {renderStatRow('EYES', defScores.eyes, chalScores.eyes, 1)}
            {renderStatRow('SKIN', defScores.skin, chalScores.skin, 2)}
            {renderStatRow('SYMMETRY', defScores.symmetry, chalScores.symmetry, 3)}
          </div>
        </div>

        {/* Buttons Section */}
        <div style={{ padding: '40px 20px 60px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button 
            onClick={() => window.location.href = `/mog/battle/${battle.challenger_username}`}
            style={{
              height: '64px',
              width: '100%',
              background: 'linear-gradient(135deg, #FF2D55 0%, #FF0055 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontFamily: 'Syne',
              fontWeight: 800,
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.05em',
              boxShadow: '0 12px 30px rgba(255,45,85,0.4)',
            }}
          >
            FIGHT AGAIN ⚔️
          </button>

          <button 
            onClick={handleShare}
            style={{
              height: '64px',
              width: '100%',
              background: 'linear-gradient(135deg, #1C1C1E 0%, #000000 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontFamily: 'Syne',
              fontWeight: 800,
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.05em',
            }}
          >
            SHARE THE DUB 👑
          </button>
        </div>
      </div>
    </div>
  );
}
