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
          border: isWinner ? '2px solid #FFCC00' : '1px solid #222',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          padding: 0,
          aspectRatio: '0.65',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 300ms ease',
          boxShadow: isWinner ? '0 0 40px rgba(255, 204, 0, 0.25)' : 'none',
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
            filter: isWinner ? 'none' : 'grayscale(100%) brightness(0.6)',
            backgroundColor: '#111'
          }}
        />

        {/* Text Gradient Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '40px 16px 16px 16px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1
        }}>
          <span style={{ fontSize: '10px', color: isWinner ? '#FFCC00' : '#D32F2F', letterSpacing: '0.2em', fontWeight: 900, marginBottom: '2px' }}>
            {isWinner ? 'MOGGER' : 'MOGGED'}
          </span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
              {player.score.toFixed(1)}
            </span>
            {isWinner && (
              <span style={{ marginLeft: '10px', color: '#FFCC00', fontSize: '24px' }}>
                🏆
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
              transform: mounted ? 'translate(-50%, -50%) rotate(-12deg) scale(1)' : 'translate(-50%, -50%) rotate(-12deg) scale(0)',
              backgroundColor: 'rgba(204, 0, 0, 0.1)',
              color: '#EE0000',
              padding: '8px 16px',
              border: '4px solid #EE0000',
              borderRadius: '8px',
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: '0.1em',
              zIndex: 2,
              backdropFilter: 'blur(3px)',
              transition: 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transitionDelay: '300ms',
              textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
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

    const leftColor = p1Won ? '#00FFFF' : '#444444';
    const rightColor = !p1Won ? '#00FFFF' : '#444444';

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, color: leftColor }}>{Math.floor(p1Val)}</span>
          <span style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.15em', flex: 1, textAlign: 'center', fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: rightColor }}>{Math.floor(p2Val)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#1A1A1A', height: '6px', borderRadius: '3px' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: '3px', 
              backgroundColor: leftColor,
              width: p1TargetWidth,
              transition: `width 400ms ease ${delay}`
            }} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', backgroundColor: '#1A1A1A', height: '6px', borderRadius: '3px' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: '3px', 
              backgroundColor: rightColor,
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
          <div style={{ textAlign: 'center', margin: '32px 0' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#00FFFF', letterSpacing: '0.05em', textShadow: '0 0 12px rgba(0,255,255,0.5)', fontFamily: 'Impact, sans-serif' }}>
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

        {/* Share Buttons */}
        <div style={{ padding: '32px 16px 40px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={handleShare}
            style={{
              height: '60px',
              width: '100%',
              background: 'linear-gradient(to right, #FF2D75, #FF4B2B)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.15em',
              borderRadius: '30px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', inset: -1, borderRadius: '31px', padding: '1px', background: 'linear-gradient(to right, #FF2D75, #FF4B2B)', zIndex: -1, opacity: 0.6, filter: 'blur(8px)' }} />
            SHARE THE DUB 👑
          </button>

          <a 
            href="/"
            style={{
              height: '60px',
              width: '100%',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '30px',
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            Get your Own Mog battle link
          </a>
        </div>
      </div>
    </div>
  );
}
