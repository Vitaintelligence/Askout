import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { loadModels, scoreFace } from '@/src/lib/mogScoring';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export function useMogBattle(userId: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<string | null>(null);

  // Load models on mount
  useEffect(() => {
    async function init() {
      try {
        await loadModels();
        setIsLoadingModels(false);
      } catch (err) {
        console.error("Failed to load face-api models", err);
        setToastMessage("Failed to load scanning models");
      }
    }
    init();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(false);
    } catch (err) {
      console.error("Camera access denied", err);
      setError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Setup camera
  useEffect(() => {
    startCamera();

    return () => {
      // Logic unchanged, this uses the stream from scope exactly like original
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Only run once on mount

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getDefenderScore = async (): Promise<any> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('username', userId)
        .single();

      if (profile && profile.avatar_url) {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = async () => {
            try {
              const score = await scoreFace(img);
              resolve(score || { jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 });
            } catch {
              resolve({ jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 });
            }
          };
          img.onerror = () => {
            resolve({ jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 });
          };
          img.src = profile.avatar_url;
        });
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback if no avatar
    return { jawline: 50, eyes: 50, skin: 50, symmetry: 50, total: 50 };
  };

  const capture = async (mediaSource: HTMLVideoElement | HTMLImageElement) => {
    if (isLoadingModels) {
      showToast("Models still loading, please wait...");
      return;
    }

    setIsCapturing(true);

    // Freeze video if necessary
    if (mediaSource instanceof HTMLVideoElement && stream) {
      mediaSource.pause();
      // Keep track of stream to restart if needed
    }

    try {
      // 1. Score Challenger (the person using camera)
      const challengerScore = await scoreFace(mediaSource);
      if (!challengerScore) {
        showToast("No face detected. Try again.");
        if (mediaSource instanceof HTMLVideoElement) mediaSource.play();
        setIsCapturing(false);
        return;
      }

      // 2. Fetch and score Defender (the original link owner)
      const defenderScore = await getDefenderScore();

      // 3. Compare scores
      const defenderWins = defenderScore.total >= challengerScore.total;
      const winnerStr = defenderWins ? 'defender' : 'challenger';

      // Capture local snapshot for result page
      let localSnapshot = '';
      if (mediaSource instanceof HTMLVideoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = mediaSource.videoWidth;
        canvas.height = mediaSource.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(mediaSource, 0, 0, canvas.width, canvas.height);
          localSnapshot = canvas.toDataURL('image/jpeg', 0.8);
        }
      } else if (mediaSource instanceof HTMLImageElement) {
        const canvas = document.createElement('canvas');
        canvas.width = mediaSource.width;
        canvas.height = mediaSource.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(mediaSource, 0, 0, canvas.width, canvas.height);
          localSnapshot = canvas.toDataURL('image/jpeg', 0.8);
        }
      }
      sessionStorage.setItem('mog_latest_snapshot', localSnapshot);

      // Find defender's true UUID (user_key / device_id)
      const { data: userRow } = await supabase
        .from('profiles')
        .select('user_key')
        .eq('username', userId)
        .single();
        
      const realChallengerId = userRow?.user_key || userId;

      // 4. Write to Supabase
      // Using opponent_id to map to the real mog_battles schema
      const { data, error: insertError } = await supabase
        .from('mog_battles')
        .insert({
          id: crypto.randomUUID(),
          challenger_id: realChallengerId, // MUST match the Flutter uid for realtime!
          opponent_id: 'anonymous', 
          challenger_username: userId,
          challenger_score: defenderScore.total, // Link owner's score
          opponent_score: challengerScore.total,  // Camera user's score
          winner: winnerStr,
          jawline_challenger: defenderScore.jawline,
          eyes_challenger: defenderScore.eyes,
          skin_challenger: defenderScore.skin,
          symmetry_challenger: defenderScore.symmetry,
          jawline_defender: challengerScore.jawline,
          eyes_defender: challengerScore.eyes,
          skin_defender: challengerScore.skin,
          symmetry_defender: challengerScore.symmetry,
          status: 'completed'
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to save battle result", insertError);
        showToast("Failed to save result. Try again.");
        if (mediaSource instanceof HTMLVideoElement) mediaSource.play();
        setIsCapturing(false);
        return;
      }

      // 5. Increment aura if defender won using Egyptian sacred numerology (7 = Perfection/Hathor, 9 = The Ennead)
      if (defenderWins && userRow?.user_key) {
        const ritualAmount = Math.random() > 0.5 ? 7 : 9;
        
        await supabase.rpc('increment_aura', {
          p_user_id: userRow.user_key,
          p_amount: ritualAmount,
          p_battle_id: data.id
        });
      }

      // 6. Return result ID instead of navigating directly
      setBattleResult(data.id);

    } catch (err) {
      console.error(err);
      showToast("An error occurred during analysis.");
      if (mediaSource instanceof HTMLVideoElement) mediaSource.play();
      setIsCapturing(false);
    }
  };

  return {
    isLoadingModels,
    isCapturing,
    error,
    toastMessage,
    videoRef,
    startCamera,
    stopCamera,
    capture,
    battleResult
  };
}
