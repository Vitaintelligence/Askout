export async function loadModels() {
  // No-op: We have migrated to the Serverless Web Supremacy architecture.
  // Models are no longer loaded on the client, drastically improving performance and stability.
  return Promise.resolve();
}

export async function scoreFace(mediaElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  let base64Image = '';

  // 1. Extract Base64 from the media element
  try {
    let canvas: HTMLCanvasElement;
    if (mediaElement instanceof HTMLCanvasElement) {
      canvas = mediaElement;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : mediaElement.width;
      canvas.height = mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : mediaElement.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(mediaElement, 0, 0, canvas.width, canvas.height);
      }
    }
    
    base64Image = canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.error("Failed to extract image data:", err);
    return null;
  }

  if (!base64Image || base64Image === 'data:,') {
     console.error("Blank image extracted.");
     return null;
  }

  // 2. Transmit to our Serverless Edge Vision API
  try {
    const response = await fetch('/api/mog/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageBase64: base64Image })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Serverless Vision Error:", response.status, errData);
      return null;
    }

    const data = await response.json();
    
    return {
      jawline: data.jawline || 50,
      eyes: data.eyes || 50,
      skin: data.skin || 50,
      symmetry: data.symmetry || 50,
      total: data.total || 50
    };
  } catch (error) {
    console.error("Failed to communicate with Vision API", error);
    return null;
  }
}
