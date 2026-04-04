"use client";

import { useEffect, useState, useRef, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

type PageProps = {
  params: Promise<{ battleId: string }> | { battleId: string };
};

export default function MogResultPage({ params }: PageProps) {
  const unwrappedParams = typeof (params as any).then === 'function'
    ? use(params as Promise<{ battleId: string }>)
    : params as { battleId: string };

  const battleId = unwrappedParams.battleId;

  const [loading, setLoading] = useState(true);
  const [battle, setBattle] = useState<any>(null);
  const [defenderProfile, setDefenderProfile] = useState<any>(null);
  const [localSnapshot, setLocalSnapshot] = useState<string | null>(null);

  // Animation states
  const [mounted, setMounted] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get snapshot from session storage
    if (typeof window !== 'undefined') {
      const snap = sessionStorage.getItem('mog_latest_snapshot');
      if (snap) setLocalSnapshot(snap);
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
          border: isWinner ? '1px solid #fff' : '1px solid #333',
          borderRadius: '16px',
          padding: '12px',
          position: 'relative',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 300ms ease'
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', marginBottom: '12px' }}>
          <img 
            src={player.photo} 
            alt={player.name}
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
              filter: isWinner ? 'none' : 'grayscale(100%)',
              backgroundColor: '#222'
            }}
          />

          {!isWinner && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: mounted ? 'translate(-50%, -50%) rotate(-8deg) scale(1)' : 'translate(-50%, -50%) rotate(-8deg) scale(0)',
                backgroundColor: '#CC0000',
                color: '#fff',
                padding: '4px 10px',
                border: '2px solid white',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                zIndex: 2,
                transition: 'transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transitionDelay: '200ms', // delay stamp
                letterSpacing: '0.05em'
              }}
            >
              MOGGED
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: isWinner ? '#ffffff' : '#666666', letterSpacing: '0.15em', marginBottom: '4px' }}>
            {isWinner ? 'MOGGER' : 'MOGGED'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', lineHeight: 1 }}>
              {player.score}
            </span>
            {isWinner && (
              <span style={{ marginLeft: '8px', color: '#ffffff', fontSize: '20px' }}>
                ✦
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStatRow = (label: string, p1Val: number, p2Val: number, index: number) => {
    // DB values are jawline_challenger (P1) and jawline_defender (P2)
    p1Val = p1Val || 0;
    p2Val = p2Val || 0;
    
    // Animate stats
    const p1TargetWidth = mounted ? `${p1Val}%` : '0%';
    const p2TargetWidth = mounted ? `${p2Val}%` : '0%';
    
    const p1WonStat = p1Val >= p2Val;
    
    const delay = `${300 + (index * 100)}ms`;

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{Math.floor(p1Val)}</span>
          <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.15em', flex: 1, textAlign: 'center' }}>{label}</span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{Math.floor(p2Val)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* P1 Bar container */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
            <div style={{ 
              height: '3px', 
              borderRadius: '2px', 
              backgroundColor: p1WonStat ? '#fff' : '#333',
              width: p1TargetWidth,
              transition: `width 400ms ease ${delay}`
            }} />
          </div>
          
          {/* P2 Bar container */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', backgroundColor: 'transparent' }}>
            <div style={{ 
              height: '3px', 
              borderRadius: '2px', 
              backgroundColor: !p1WonStat ? '#fff' : '#333',
              width: p2TargetWidth,
              transition: `width 400ms ease ${delay}`
            }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Capturable container */}
        <div ref={contentRef} style={{ padding: '0 16px', backgroundColor: '#000000' }}>
          
          {/* Header */}
          <div style={{ marginTop: '20px', marginBottom: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#ffffff', letterSpacing: '0.15em', fontWeight: 600 }}>
              MOG BATTLE RESULT
            </span>
          </div>

          {/* Cards Layout - Winner left, loser right */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {renderCard(winnerData, true)}
            {renderCard(loserData, false)}
          </div>

          {/* Winner Line */}
          <div style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.05em' }}>
              WINNER: {winnerData.name.toUpperCase()}
            </span>
          </div>

          {/* Stat Rows */}
          <div style={{ padding: '0 8px' }}>
            {renderStatRow(
              'JAWLINE', 
              battle.jawline_challenger, 
              battle.jawline_defender,
              0
            )}
            {renderStatRow(
              'EYES', 
              battle.eyes_challenger, 
              battle.eyes_defender,
              1
            )}
            {renderStatRow(
              'SKIN', 
              battle.skin_challenger, 
              battle.skin_defender,
              2
            )}
            {renderStatRow(
              'SYMMETRY', 
              battle.symmetry_challenger, 
              battle.symmetry_defender,
              3
            )}
          </div>
        </div>

        {/* Share Button (Excluded from capture area manually if needed, or included on bottom) */}
        {/* Wait, the user said "capture the two cards + winner line + stats". contentRef wraps exactly that! */}
        <button 
          onClick={handleShare}
          style={{
            height: '52px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            borderRadius: '12px',
            border: 'none',
            margin: '32px 16px 40px 16px',
            cursor: 'pointer',
            transition: 'opacity 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          onTouchStart={(e) => e.currentTarget.style.opacity = '0.8'}
          onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
        >
          SHARE RESULT
        </button>

      </div>
    </div>
  );
}
