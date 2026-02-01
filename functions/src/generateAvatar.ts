import { onCall, HttpsError } from 'firebase-functions/v2/https';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

interface PredictionResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  urls?: { get: string };
}

async function callReplicate(
  prompt: string,
  aspectRatio: string
): Promise<string> {
  const apiToken = REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new HttpsError('failed-precondition', 'Replicate API token not configured');
  }

  const makeRequest = async (): Promise<Response> => {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await fetch(
        'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            Prefer: 'wait',
          },
          body: JSON.stringify({
            input: {
              prompt,
              aspect_ratio: aspectRatio,
              output_format: 'webp',
              output_quality: 90,
              safety_tolerance: 2,
              prompt_upsampling: true,
            },
          }),
        }
      );
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '15', 10);
        console.log(`Rate limited, retrying in ${retryAfter}s (attempt ${attempt + 1})`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      return res;
    }
    throw new HttpsError('resource-exhausted', 'Rate limited by image generation API');
  };

  const createResponse = await makeRequest();

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    console.error('Replicate create error:', errorBody);
    throw new HttpsError('internal', 'Failed to create prediction');
  }

  const prediction: PredictionResponse = await createResponse.json();
  const getUrl = prediction.urls?.get;

  if (!getUrl) {
    throw new HttpsError('internal', 'No polling URL returned from Replicate');
  }

  // Poll for result (max 60s, every 2s)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollResponse = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!pollResponse.ok) {
      console.error('Replicate poll error:', await pollResponse.text());
      continue;
    }

    const result: PredictionResponse = await pollResponse.json();

    if (result.status === 'succeeded') {
      const output = Array.isArray(result.output)
        ? result.output[0]
        : result.output;
      if (!output) {
        throw new HttpsError('internal', 'Prediction succeeded but no output URL');
      }
      return output;
    }

    if (result.status === 'failed' || result.status === 'canceled') {
      throw new HttpsError('internal', result.error || 'Prediction failed');
    }
  }

  throw new HttpsError('deadline-exceeded', 'Avatar generation timed out');
}

export const generateAvatarPortrait = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { prompt } = request.data;
    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'prompt is required');
    }

    const imageUrl = await callReplicate(prompt, '1:1');
    return { imageUrl };
  }
);

export const generateAvatarFullBody = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { prompt } = request.data;
    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'prompt is required');
    }

    const imageUrl = await callReplicate(prompt, '2:3');
    return { imageUrl };
  }
);

// --- Head Swap (WaveSpeedAI) ---
// Replaces entire head (face + hair + outline) while keeping body/background

interface WaveSpeedResponse {
  code: number;
  message: string;
  data: {
    id: string;
    status: 'created' | 'processing' | 'completed' | 'failed';
    outputs: string[];
    urls?: { get: string };
    error?: string;
  };
}

async function callWaveSpeedHeadSwap(
  sourceImageUrl: string,
  avatarFaceUrl: string
): Promise<string> {
  const apiKey = WAVESPEED_API_KEY;
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'WaveSpeed API key not configured');
  }

  console.log('Head swap input:', JSON.stringify({
    image: sourceImageUrl.substring(0, 80),
    face_image: avatarFaceUrl.substring(0, 80),
  }));

  // Try sync mode first (waits for result)
  const createResponse = await fetch(
    'https://api.wavespeed.ai/api/v3/wavespeed-ai/image-head-swap',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: sourceImageUrl,
        face_image: avatarFaceUrl,
        output_format: 'webp',
        enable_sync_mode: true,
      }),
    }
  );

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    console.error('WaveSpeed create error:', createResponse.status, errorBody);
    throw new HttpsError('internal', 'Failed to create head swap request');
  }

  const result: WaveSpeedResponse = await createResponse.json();
  console.log('WaveSpeed response:', result.data?.id, 'status:', result.data?.status);

  // Sync mode: result should be ready
  if (result.data?.status === 'completed' && result.data.outputs?.length > 0) {
    console.log('Head swap completed (sync)');
    return result.data.outputs[0];
  }

  // If not completed yet, poll
  const getUrl = result.data?.urls?.get;
  if (!getUrl) {
    // Try constructing the polling URL from the task ID
    if (!result.data?.id) {
      console.error('No task ID or polling URL:', JSON.stringify(result));
      throw new HttpsError('internal', 'No polling URL returned from WaveSpeed');
    }
  }

  const pollUrl = getUrl || `https://api.wavespeed.ai/api/v3/predictions/${result.data.id}/result`;

  // Poll for result (max 90s, every 2s)
  const maxAttempts = 45;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollResponse = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollResponse.ok) {
      console.log(`Poll attempt ${i + 1} failed: ${pollResponse.status}`);
      continue;
    }

    const pollResult: WaveSpeedResponse = await pollResponse.json();
    if (i % 5 === 0) {
      console.log(`Poll attempt ${i + 1}: status=${pollResult.data?.status}`);
    }

    if (pollResult.data?.status === 'completed' && pollResult.data.outputs?.length > 0) {
      console.log(`Head swap completed after ${(i + 1) * 2}s`);
      return pollResult.data.outputs[0];
    }

    if (pollResult.data?.status === 'failed') {
      console.error('Head swap failed:', pollResult.data.error);
      throw new HttpsError('internal', pollResult.data.error || 'Head swap failed');
    }
  }

  throw new HttpsError('deadline-exceeded', 'Head swap timed out');
}

export const faceSwap = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { sourceImageUrl, swapFaceUrl } = request.data;
    if (!sourceImageUrl || typeof sourceImageUrl !== 'string') {
      throw new HttpsError('invalid-argument', 'sourceImageUrl is required');
    }
    if (!swapFaceUrl || typeof swapFaceUrl !== 'string') {
      throw new HttpsError('invalid-argument', 'swapFaceUrl is required');
    }

    const resultUrl = await callWaveSpeedHeadSwap(sourceImageUrl, swapFaceUrl);
    return { imageUrl: resultUrl };
  }
);
