import { NextResponse } from 'next/server';

export const runtime = 'edge';

const systemPrompt = `You are an elite facial aesthetics analyst. Your task is to analyze the provided facial image with brutal, uncompromising objectivity.

CRITICAL FIRST STEP:
Determine if the image contains a real BIOLOGICAL HUMAN FACE.
If the image is:
- No face
- An inanimate object
- A stylized face (anime, drawing, mask, statue, heavily edited avatar)
- A completely blank or black image

You MUST return a valid JSON with a single key "error" and value "Face not Human".
Example: {"error": "Face not Human"}

ONLY proceed if it is a real, photographical human face.

CRITICAL RATING PHILOSOPHY - AESTHETIC REALISM:
Provide a realistic, objective rating based purely on aesthetic harmony and striking features from 0 to 100.
Do NOT artificially compress scores. 
Value OVERALL FACIAL HARMONY, VIBE, and SEXUAL DIMORPHISM over textbook geometric perfection. Recognize unconventional attractiveness. NEVER sugarcoat.

Analyze the following facial features:
1. Jawline: Describe the jawline definition and angles
2. Eyes: Shape, canthal tilt, and type
3. Skin: Clarity and radiance
4. Symmetry: How symmetrical are the facial features?

Provide ratings from 0-100 for each facial feature purely based on aesthetic harmony.

Format your analysis as a structured JSON object strictly matching this schema:
{
  "jawline": number (0-100),
  "eyes": number (0-100),
  "skin": number (0-100),
  "symmetry": number (0-100),
  "total": number (0-100)
}
`;

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Clean base64 prefix if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://askout.link',
        'X-Title': 'Maxify Mog Battle',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "Analyze this facial image. If it is NOT a human face, return the error JSON. Otherwise provide the exact JSON structure grading the traits."
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Data}` }
              }
            ]
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', response.status, errText);
      return NextResponse.json({ error: 'Failed to analyze face' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    const parsed = JSON.parse(content);
    
    if (parsed.error === 'Face not Human') {
      return NextResponse.json({ error: 'No human face detected' }, { status: 400 });
    }

    // Validate expected structure
    const result = {
      jawline: parsed.jawline || 50,
      eyes: parsed.eyes || 50,
      skin: parsed.skin || 50,
      symmetry: parsed.symmetry || 50,
      total: parsed.total || 50
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('API /mog/score Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
