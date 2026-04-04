const fs = require('fs');
const filePath = 'c:/Wealth Projects/Apps/Maxify V2 (main)/Askout Web/app/mog/battle/[userId]/page.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.startsWith('  return ('));
if (startIdx !== -1) {
  const newHeader = `"use client";

import { useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMogBattle } from '@/hooks/useMogBattle';

type PageProps = {
  params: Promise<{ userId: string }> | { userId: string };
};

export default function MogBattlePage({ params }: PageProps) {
  const unwrappedParams = typeof (params as any).then === 'function'
    ? use(params as Promise<{ userId: string }>)
    : params as { userId: string };

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
      router.push(\`/mog/result/\${battleResult}\`);
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

`;
  fs.writeFileSync(filePath, newHeader + lines.slice(startIdx).join('\n'), 'utf8');
  console.log('Successfully patched page.tsx');
} else {
  console.log('Failed to find return statement');
}
