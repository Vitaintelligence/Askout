"use client";

import { useEffect, useState, useRef, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
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
        // Fetch battle
        const { data: bData, error: bErr } = await supabase
          .from('mog_battles')
          .select('*')
          .eq('id', battleId)
          .single();

        if (bErr || !bData) throw new Error("Battle not found");
        
        setBattle(bData);

        // Fetch defender profile directly since no FK relationship
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [battleId]);

  // Handle animations after data loads
  useEffect(() => {
    if (!loading && battle) {
      setTimeout(() => setMounted(true), 50);

      // Animate scores
      const duration = 600;
      const steps = 30;
      const interval = duration / steps;
      let currentStep = 0;

      // Ensure scores exist in DB else fallback to 50
      const targetP1 = battle.challenger_score || 0; // P1 = link owner (defender mapped to challenger_score)
      const targetP2 = battle.opponent_score || 0;   // P2 = camera user (challenger mapped to opponent_score)

      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        // Easing function: easeOutQuad
        const ease = progress * (2 - progress);
        
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
        scale: 2, // Higher quality
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'mog-result.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mog Battle Result',
          text: 'I just finished a Mog Battle! Can you mog me?'
        });
      } else {
        // Fallback: download
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'mog-result.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error sharing', err);
      // Fallback
      alert("Sharing not supported on this device. Screenshot the page instead!");
    }
  };

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  if (!battle) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff' }}>Battle not found or expired.</p>
      </div>
    );
  }

  // P1 = Link owner. P2 = Camera user. 
  // 'defender' winning means link owner won.
  const p1Won = battle.winner === 'defender';
  const p2Won = battle.winner === 'challenger';

  const p1Data = {
    name: defenderProfile?.username || 'PLAYER 1',
    photo: defenderProfile?.avatar_url || '', // Fallback empty
    won: p1Won,
    score: scores.p1
  };

  const p2Data = {
    name: 'YOU',
    photo: localSnapshot || '',
    won: p2Won,
    score: scores.p2
  };

  const winnerData = p1Won ? p1Data : p2Data;
  const loserData = p1Won ? p2Data : p1Data;

  const renderCard = (player: any, isWinner: boolean) => {
    return (
      <div 
        style={{
          flex: 1,
          backgroundColor: '#111',
          border: isWinner ? '1.5px solid #ffffff' : '1px solid #333',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          padding: 0,
          aspectRatio: '0.65',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 300ms ease',
        }}
      >
        <img 
          src={player.photo} 
          alt={player.name}
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isWinner ? 'none' : 'grayscale(100%) opacity(0.6)',
            backgroundColor: '#111'
          }}
        />

        {/* Text Fade Overlay - No gradients, just solid dark gradient for text legibility */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '40px 16px 16px 16px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1
        }}>
          <span style={{ fontSize: '10px', color: isWinner ? '#ffffff' : '#888888', letterSpacing: '0.15em', fontWeight: 900, marginBottom: '4px' }}>
            {isWinner ? 'AURA SEIZED' : 'MOGGED'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
              {player.score.toFixed(1)}
            </span>
            {isWinner && (
              <span style={{ marginLeft: '10px', color: '#ffffff', fontSize: '18px' }}>
                𓋹
              </span>
            )}
          </div>
        </div>

        {!isWinner && (
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              backgroundColor: 'transparent',
              padding: '6px 16px',
              border: '4px solid #FF0055',
              borderRadius: '8px',
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '0.05em',
              zIndex: 10,
              color: '#FF0055',
              transform: mounted ? 'translate(-50%, -50%) rotate(-15deg) scale(1)' : 'translate(-50%, -50%) rotate(-15deg) scale(4)',
              opacity: mounted ? 1 : 0,
              transition: 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.5) 0.3s, opacity 0.1s ease-in 0.3s',
              boxShadow: mounted ? '0 0 20px rgba(255,0,85,0.3), inset 0 0 10px rgba(255,0,85,0.3)' : 'none',
              textShadow: '0 0 10px rgba(255,0,85,0.3)',
            }}
          >
            MOGGED
          </div>
        )}
      </div>
    );
  };

  const renderStatRow = (label: string, p1Val: number, p2Val: number, index: number) => {
    p1Val = p1Val || 0;
    p2Val = p2Val || 0;
    
    const p1TargetWidth = mounted ? `${p1Val}%` : '0%';
    const p2TargetWidth = mounted ? `${p2Val}%` : '0%';
    
    const delay = `${300 + (index * 100)}ms`;

    const leftColor = p1Won ? '#ffffff' : '#444444';
    const rightColor = !p1Won ? '#ffffff' : '#444444';

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: leftColor }}>{Math.floor(p1Val)}</span>
          <span style={{ fontSize: '10px', color: '#888888', letterSpacing: '0.15em', flex: 1, textAlign: 'center', fontWeight: 800 }}>{label}</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: rightColor }}>{Math.floor(p2Val)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#1A1A1A', height: '4px', borderRadius: '4px' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: '4px', 
              backgroundColor: leftColor,
              width: p1TargetWidth,
              transition: `width 400ms ease ${delay}`
            }} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', backgroundColor: '#1A1A1A', height: '4px', borderRadius: '4px' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: '4px', 
              backgroundColor: rightColor,
              width: p2TargetWidth,
              transition: `width 400ms ease ${delay}`
            }} />
          </div>
        </div>
      </div>
    );
  };

  // Safe fallback to default scores if missing
  const defScores = localDefenderScore || { jawline: 50, eyes: 50, skin: 50, symmetry: 50 };
  const chalScores = localChallengerScore || { jawline: 50, eyes: 50, skin: 50, symmetry: 50 };

  return (
    <div style={{ backgroundColor: '#09090B', minHeight: '100vh', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Capturable container */}
        <div ref={contentRef} style={{ padding: '0 16px', backgroundColor: '#09090B' }}>
          
          {/* Header */}
          <div style={{ marginTop: '24px', marginBottom: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.2em', fontWeight: 800 }}>
              MOG BATTLE RESULT
            </span>
          </div>

          {/* Cards Layout - Winner left, loser right */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {renderCard(winnerData, true)}
            {renderCard(loserData, false)}
          </div>

          {/* Winner Text block */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {winnerData.name.toUpperCase()} WON
            </span>
          </div>

          {/* Stat Rows */}
          <div style={{ padding: '0 8px' }}>
            {renderStatRow(
              'JAWLINE', 
              defScores.jawline || 0, 
              chalScores.jawline || 0,
              0
            )}
            {renderStatRow(
              'EYES', 
              defScores.eyes || 0, 
              chalScores.eyes || 0,
              1
            )}
            {renderStatRow(
              'SKIN', 
              defScores.skin || 0, 
              chalScores.skin || 0,
              2
            )}
            {renderStatRow(
              'SYMMETRY', 
              defScores.symmetry || 0, 
              chalScores.symmetry || 0,
              3
            )}
          </div>
        </div>

        {/* Share Buttons */}
        <div style={{ padding: '40px 16px 48px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={handleShare}
            style={{
              height: '56px',
              width: '100%',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 800,
              borderRadius: '28px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s'
            }}
          >
            SHARE RESULT
          </button>

          <a 
            href="/"
            style={{
              height: '56px',
              width: '100%',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '28px',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
