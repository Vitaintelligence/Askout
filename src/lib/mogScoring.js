import * as faceapi from 'face-api.js';

export async function loadModels() {
  const MODEL_URL = '/models';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
  ]);
}

function calculateDistance(point1: faceapi.Point, point2: faceapi.Point) {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}

function normalize(value: number, min: number, max: number) {
  let normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

export async function scoreFace(mediaElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  const detection = await faceapi.detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

  if (!detection) {
    return null;
  }

  const landmarks = detection.landmarks.positions;
  const box = detection.detection.box;

  // 1. JAWLINE
  // Score = symmetry of left vs right jaw width
  const jawlinePoints = landmarks.slice(0, 17); // 0 to 16
  const chinIndex = 8;
  const chin = jawlinePoints[chinIndex];
  
  let jawDeviationSum = 0;
  for (let i = 0; i < chinIndex; i++) {
    const leftPoint = jawlinePoints[i];
    const rightPoint = jawlinePoints[16 - i];
    
    const leftDist = calculateDistance(chin, leftPoint);
    const rightDist = calculateDistance(chin, rightPoint);
    
    jawDeviationSum += Math.abs(leftDist - rightDist);
  }
  
  // Normalize jawline (lower deviation sum is better)
  // Max deviation varies, but let's assume a realistic max is box.width / 2
  const maxJawDeviation = box.width / 2;
  const jawlineScore = 100 - normalize(jawDeviationSum, 0, maxJawDeviation);

  // 2. EYES
  // Score = avg eye openness ratio + symmetry between left and right openness
  const leftEye = landmarks.slice(36, 42);
  const rightEye = landmarks.slice(42, 48);

  const getEyeOpenness = (eye: faceapi.Point[]) => {
    const width = calculateDistance(eye[0], eye[3]);
    const height1 = calculateDistance(eye[1], eye[5]);
    const height2 = calculateDistance(eye[2], eye[4]);
    const avgHeight = (height1 + height2) / 2;
    return avgHeight / width;
  };

  const leftOpenness = getEyeOpenness(leftEye);
  const rightOpenness = getEyeOpenness(rightEye);
  
  const avgOpenness = (leftOpenness + rightOpenness) / 2;
  const opennessDiff = Math.abs(leftOpenness - rightOpenness);
  
  // Normalize eyes (ideal openness around 0.3, lower diff is better)
  const opennessScore = normalize(avgOpenness, 0.1, 0.4);
  const eyeSymmetryScore = 100 - normalize(opennessDiff, 0, 0.1);
  const eyesScore = (opennessScore * 0.7) + (eyeSymmetryScore * 0.3);

  // 3. SKIN
  let skinScore = 0;
  // We can only calculate skin score if we can draw the element to a canvas
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = mediaElement.width || (mediaElement as HTMLVideoElement).videoWidth;
      canvas.height = mediaElement.height || (mediaElement as HTMLVideoElement).videoHeight;
      ctx.drawImage(mediaElement, 0, 0, canvas.width, canvas.height);
      
      // Extract a representative patch of skin (e.g., forehead or cheeks)
      // Let's use bounding box roughly corresponding to cheeks/forehead
      const patchX = box.x + box.width * 0.25;
      const patchY = box.y + box.height * 0.2;
      const patchWidth = box.width * 0.5;
      const patchHeight = box.height * 0.3;
      
      const imageData = ctx.getImageData(patchX, patchY, patchWidth, patchHeight);
      const data = imageData.data;
      
      let sumBrightness = 0;
      const brightnessValues = [];
      
      for (let i = 0; i < data.length; i += 4) {
        // Simple luminance calculation
        const brightness = (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
        brightnessValues.push(brightness);
        sumBrightness += brightness;
      }
      
      const avgBrightness = sumBrightness / brightnessValues.length;
      let varianceSum = 0;
      
      for (const b of brightnessValues) {
        varianceSum += Math.pow(b - avgBrightness, 2);
      }
      
      const stdDev = Math.sqrt(varianceSum / brightnessValues.length);
      
      // Normalize skin (lower standard deviation = smoother = better)
      skinScore = 100 - normalize(stdDev, 0, 40); // 40 is a rough upper bound for std dev
    }
  } catch (e) {
    console.warn("Could not calculate skin score (CORS or canvas issue)", e);
    skinScore = 50; // Fallback
  }

  // 4. SYMMETRY
  // Mirror landmark x-coords around face horizontal midpoint
  const faceMidpointX = box.x + (box.width / 2);
  let totalSymmetryDistance = 0;
  
  // Compare left side landmarks (e.g. left eyebrow 17-21) to right side (22-26)
  // Left eye (36-41) to right eye (42-47)
  // Left jaw (0-7) to right jaw (16-9)
  const symmetryPairs = [
    // Jaw
    [0, 16], [1, 15], [2, 14], [3, 13], [4, 12], [5, 11], [6, 10], [7, 9],
    // Eyebrows
    [17, 26], [18, 25], [19, 24], [20, 23], [21, 22],
    // Eyes
    [36, 45], [37, 44], [38, 43], [39, 42], [40, 47], [41, 46],
    // Mouth corners
    [48, 54], [49, 53], [59, 55]
  ];

  for (const pair of symmetryPairs) {
    const leftPt = landmarks[pair[0]];
    const rightPt = landmarks[pair[1]];
    
    // Mirror left point X across midpoint
    const mirroredLeftX = faceMidpointX + (faceMidpointX - leftPt.x);
    
    // Calculate distance between mirrored left and actual right
    // We mainly care about the overall structural deviation
    const dx = mirroredLeftX - rightPt.x;
    const dy = leftPt.y - rightPt.y; // Y should be identical
    
    totalSymmetryDistance += Math.sqrt(dx*dx + dy*dy);
  }
  
  const avgSymmetryDistance = totalSymmetryDistance / symmetryPairs.length;
  // Normalize symmetry (lower avg distance = better)
  const symmetryScore = 100 - normalize(avgSymmetryDistance, 0, box.width * 0.1);

  // 5. TOTAL
  const jawline = Math.round(jawlineScore);
  const eyes = Math.round(eyesScore);
  const skin = Math.round(skinScore);
  const symmetry = Math.round(symmetryScore);
  
  const total = Math.round(
    (jawline * 0.25) + 
    (eyes * 0.25) + 
    (skin * 0.20) + 
    (symmetry * 0.30)
  );

  return {
    jawline,
    eyes,
    skin,
    symmetry,
    total
  };
}

/* 
// --- SIMPLE TEST ---
// Uncomment to test in browser console once loaded
(async () => {
  await loadModels();
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "https://ui-avatars.com/api/?name=Test+Face"; 
  img.onload = async () => {
    const score = await scoreFace(img);
    console.log("Face Score:", score);
  };
})();
*/
