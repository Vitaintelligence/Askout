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
  const [defenderProfile, setDefenderProfile] = useState<any>(null);
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

        // Fetch defender (link owner) profile
        const { data: pData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('username', bData.challenger_username)
          .single();
          
        if (pData) {
          setDefenderProfile(pData);
        } else {
          setDefenderProfile({ username: bData.challenger_username || 'Unknown', avatar_url: null });
        }
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
      const duration = 800;
      const steps = 40;
      const interval = duration / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const ease = progress * (2 - progress); // easeOutQuad
        
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
        scale: 2,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'mog-result.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mog Battle Result',
          text: 'I just finished a Mog Battle on Maxify! Check my status.'
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

  if (!battle) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>UNABLE TO LOAD RESULT</h2>
          <p style={{ opacity: 0.6 }}>The battle ID may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  // P1 = Defender (link owner), P2 = Challenger (web camera)
  // bData.challenger_id is the link owner's ID
  const p1Won = battle.winner_id === battle.challenger_id;
  const p2Won = battle.winner_id === battle.opponent_id || battle.winner_id === 'anonymous_web';

  const p1Data = {
    name: defenderProfile?.username?.toUpperCase() || 'PLAYER 1',
    photo: defenderProfile?.avatar_url || '',
    isWinner: p1Won,
    score: scores.p1 / 10
  };

  const p2Data = {
    name: 'PLAYER 2',
    photo: localSnapshot || battle.opponent_image_url || '',
    isWinner: p2Won,
    score: scores.p2 / 10
  };

  const renderCard = (player: any, isP1: boolean) => {
    const isWinner = player.isWinner;
    
    return (
      <div 
        style={{
          flex: 1,
          backgroundColor: '#131316',
          border: isWinner ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px',
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: '0.62',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: isWinner ? '0 0 30px rgba(255,215,0,0.15)' : 'none',
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
              filter: isWinner ? 'none' : 'grayscale(100%) brightness(0.4)',
              backgroundColor: '#131316'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '40px' }}>?</span>
          </div>
        )}

        {/* Text Fade Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '40px 18px 24px 18px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span style={{ 
            fontSize: '11px', 
            color: isWinner ? '#FFD700' : 'rgba(255,255,255,0.4)', 
            letterSpacing: '0.15em', 
            fontWeight: 900, 
            marginBottom: '4px' 
          }}>
            {isWinner ? 'MOGGER' : 'MOGGED'}
          </span>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 900, 
            color: '#ffffff', 
            marginBottom: '12px', 
            letterSpacing: '-0.02em' 
          }}>
            {player.name}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '42px', 
              fontWeight: 900, 
              color: isWinner ? '#FFD700' : '#ffffff', 
              lineHeight: 1,
              letterSpacing: '-0.04em'
            }}>
              {player.score.toFixed(1)}
            </span>
            {isWinner && (
              <span style={{ marginLeft: '8px', color: '#FFD700', fontSize: '24px' }}>
                🏆
              </span>
            )}
          </div>
        </div>

        {/* "MOGGED" Stamp */}
        {!isWinner && (
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              backgroundColor: '#FF2D55',
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '26px',
              fontWeight: 900,
              letterSpacing: '0.05em',
              zIndex: 10,
              color: '#ffffff',
              boxShadow: '0 8px 32px rgba(255,45,85,0.4)',
              transform: mounted 
                ? 'translate(-50%, -50%) rotate(-15deg) scale(1)' 
                : 'translate(-50%, -50%) rotate(-15deg) scale(3)',
              opacity: mounted ? 1 : 0,
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s, opacity 0.2s ease 0.4s',
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

    const activeColor = '#00FFFF'; // Teal/Cyan accent
    const inactiveColor = '#1A1A1E';

    return (
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, color: p1Won ? activeColor : '#ffffff', width: '35px' }}>{Math.floor(p1Val)}</span>
          <span style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.5)', 
            letterSpacing: '0.22em', 
            flex: 1, 
            textAlign: 'center', 
            fontWeight: 800 
          }}>
            {label} {p1Val > p2Val ? '←' : p2Val > p1Val ? '→' : ''}
          </span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: p2Won ? activeColor : '#ffffff', width: '35px', textAlign: 'right' }}>{Math.floor(p2Val)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* P1 bar (grows from right to left) */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: inactiveColor, height: '6px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: '100px', 
              backgroundColor: p1Won ? activeColor : 'rgba(255,255,255,0.15)',
              width: p1Percent,
              transition: `width 600ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}`
            }} />
          </div>
          
          {/* P2 bar (grows from left to right) */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', backgroundColor: inactiveColor, height: '6px', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: '100px', 
              backgroundColor: p2Won ? activeColor : 'rgba(255,255,255,0.15)',
              width: p2Percent,
              transition: `width 600ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}`
            }} />
          </div>
        </div>
      </div>
    );
  };

  const defScores = localDefenderScore || { jawline: 50, eyes: 50, skin: 50, symmetry: 50 };
  const chalScores = localChallengerScore || { jawline: 55, eyes: 55, skin: 55, symmetry: 55 }; // Slight dummy if missing

  return (
    <div style={{ backgroundColor: '#09090B', minHeight: '100vh', width: '100%', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#fff' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Screenshot Container */}
        <div ref={contentRef} style={{ padding: '0 20px', backgroundColor: '#09090B' }}>
          
          {/* Header Title */}
          <div style={{ paddingTop: '32px', marginBottom: '32px', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', letterSpacing: '0.3em', fontWeight: 900, opacity: 0.8 }}>
              MOG BATTLE RESULT
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '40px' }}>
            {renderCard(p1Data, true)}
            {renderCard(p2Data, false)}
          </div>

          {/* Winner Teal Text */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ 
              fontSize: '22px', 
              fontWeight: 900, 
              color: '#00FFFF', 
              letterSpacing: '0.05em',
              textShadow: '0 0 20px rgba(0,255,255,0.3)'
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
        <div style={{ padding: '48px 20px 60px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => window.location.href = `/mog/battle/${battle.challenger_username}`}
            style={{
              height: '62px',
              width: '100%',
              background: 'linear-gradient(135deg, #FF2D55 0%, #FF0055 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 900,
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.05em',
              boxShadow: '0 12px 30px rgba(255,45,85,0.4)',
              transition: 'transform 0.2s active'
            }}
          >
            FIGHT AGAIN ⚔️
          </button>

          <button 
            onClick={handleShare}
            style={{
              height: '62px',
              width: '100%',
              background: 'linear-gradient(135deg, #FF2079 0%, #FF2D55 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 900,
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.05em',
              boxShadow: '0 12px 30px rgba(255,32,121,0.25)',
            }}
          >
            SHARE THE DUB 👑
          </button>
        </div>
      </div>
    </div>
  );
}
