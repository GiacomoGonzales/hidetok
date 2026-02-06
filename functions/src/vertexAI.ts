/**
 * AI Integration for Professional Avatar Generation
 *
 * Architecture (as recommended by Gemini):
 * - Gemini 1.5 Pro: Image analysis - the "Brain" (pose, lighting, objects)
 * - Imagen 3: Image generation - the "Painter" (stable, photorealistic)
 */

// Project configuration
const PROJECT_ID = 'hidetok-9a642';
const LOCATION = 'us-central1';
const BUCKET_NAME = 'hidetok-9a642.firebasestorage.app';

// Get API key from environment
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY not configured in environment');
  }
  return key;
}

// Lazy-loaded clients
let geminiInstance: any = null;
let predictionClientInstance: any = null;
let storageInstance: any = null;

async function getGemini() {
  if (!geminiInstance) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    geminiInstance = new GoogleGenerativeAI(getGeminiApiKey());
    console.log('Gemini AI initialized');
  }
  return geminiInstance;
}

async function getPredictionClient() {
  if (!predictionClientInstance) {
    const { PredictionServiceClient } = await import('@google-cloud/aiplatform');
    predictionClientInstance = new PredictionServiceClient({
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    });
    console.log('Vertex AI Prediction Client initialized');
  }
  return predictionClientInstance;
}

async function getStorage() {
  if (!storageInstance) {
    const { Storage } = await import('@google-cloud/storage');
    storageInstance = new Storage();
    console.log('Cloud Storage initialized');
  }
  return storageInstance;
}

// ============================================
// INTERFACES
// ============================================

export interface SceneAnalysis {
  person: {
    gender: string;
    clothing: string;
    accessories: string[];
    pose: string;
    bodyPosition: string;
  };
  camera: {
    angle: string;
    distance: string;
    framing: string;
  };
  lighting: {
    type: string;
    direction: string;
    intensity: string;
    color: string;
  };
  background: {
    setting: string;
    objects: string[];
    depth: string;
  };
}

export interface AvatarConfig {
  gender: string;
  skinTone: string;
  hairStyle: string;
  hairColor?: string;
  ageRange: string;
  eyeColor: string;
  faceShape: string;
  facialHair?: string;
  accessories?: string;
  expression: string;
  clothing?: string;
}

// ============================================
// GEMINI 1.5 PRO - IMAGE ANALYSIS (Brain)
// ============================================

/**
 * Analyzes a selfie image and extracts detailed scene information
 * Returns structured JSON with pose, lighting, and background details
 */
export async function analyzeSceneWithGemini(imageBase64: string, mimeType: string): Promise<SceneAnalysis> {
  const genAI = await getGemini();

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
  });

  const prompt = `Analyze this image and extract detailed information in JSON format.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "person": {
    "gender": "male/female/unknown",
    "clothing": "description of what they're wearing",
    "accessories": ["list", "of", "accessories"],
    "pose": "standing/sitting/leaning/etc",
    "bodyPosition": "detailed description of body orientation"
  },
  "camera": {
    "angle": "eye-level/high-angle/low-angle",
    "distance": "close-up/medium/full-body",
    "framing": "centered/rule-of-thirds/etc"
  },
  "lighting": {
    "type": "natural/artificial/mixed",
    "direction": "front/side/back/overhead",
    "intensity": "soft/harsh/dramatic",
    "color": "warm/cool/neutral"
  },
  "background": {
    "setting": "indoor/outdoor description",
    "objects": ["visible", "background", "objects"],
    "depth": "shallow/medium/deep blur"
  }
}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    },
  ]);

  const response = result.response;
  const text = response.text() || '';

  // Clean and parse JSON
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
  }

  try {
    return JSON.parse(jsonStr) as SceneAnalysis;
  } catch (error) {
    console.error('Failed to parse scene analysis:', text);
    return {
      person: {
        gender: 'unknown',
        clothing: 'casual clothing',
        accessories: [],
        pose: 'standing',
        bodyPosition: 'facing camera',
      },
      camera: {
        angle: 'eye-level',
        distance: 'medium',
        framing: 'centered',
      },
      lighting: {
        type: 'natural',
        direction: 'front',
        intensity: 'soft',
        color: 'neutral',
      },
      background: {
        setting: 'indoor',
        objects: [],
        depth: 'medium',
      },
    };
  }
}

// ============================================
// IMAGEN 3 - AVATAR GENERATION (Painter)
// ============================================

/**
 * Generates an avatar image using Imagen 3 via Vertex AI
 */
export async function generateAvatarWithImagen(
  avatarConfig: AvatarConfig,
  sceneContext?: SceneAnalysis
): Promise<string> {
  const prompt = buildAvatarPrompt(avatarConfig, sceneContext);

  console.log('Generating avatar with Imagen 3...');
  console.log('Prompt:', prompt.substring(0, 200) + '...');

  const client = await getPredictionClient();

  // Imagen 3 endpoint
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001`;

  const instance = {
    prompt: prompt,
  };

  const parameters = {
    sampleCount: 1,
    aspectRatio: '1:1',
    safetyFilterLevel: 'block_only_high',
    personGeneration: 'allow_adult',
  };

  const request = {
    endpoint,
    instances: [{ structValue: { fields: toProtobufStruct(instance) } }],
    parameters: { structValue: { fields: toProtobufStruct(parameters) } },
  };

  const [response] = await client.predict(request);

  // Extract the generated image
  const predictions = response.predictions;
  if (!predictions || predictions.length === 0) {
    throw new Error('No image generated by Imagen 3');
  }

  const prediction = predictions[0];
  const imageBytes = prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;

  if (!imageBytes) {
    throw new Error('No image data in Imagen 3 response');
  }

  return `data:image/png;base64,${imageBytes}`;
}

/**
 * Builds a detailed prompt for avatar generation
 */
function buildAvatarPrompt(config: AvatarConfig, scene?: SceneAnalysis): string {
  const parts: string[] = [];

  // Base description - optimized for Imagen 3
  parts.push(`Professional portrait photograph of a fictional ${config.ageRange} ${config.gender}`);

  // Physical features
  parts.push(`with ${config.skinTone}`);
  parts.push(`${config.hairStyle}`);
  if (config.hairColor) parts.push(`(${config.hairColor})`);
  parts.push(`${config.eyeColor}`);
  parts.push(`${config.faceShape}`);

  // Facial hair
  if (config.facialHair && config.facialHair !== '') {
    parts.push(`with ${config.facialHair}`);
  }

  // Expression
  parts.push(`${config.expression}`);

  // Accessories
  if (config.accessories && config.accessories !== '') {
    parts.push(`${config.accessories}`);
  }

  // Clothing
  if (config.clothing) {
    parts.push(`wearing ${config.clothing}`);
  }

  // Photography style
  if (scene) {
    parts.push(`. ${scene.camera.angle} angle, ${scene.camera.distance} shot`);
    parts.push(`${scene.lighting.type} ${scene.lighting.intensity} lighting`);
  } else {
    parts.push(`. Natural selfie style, smartphone front camera, soft natural lighting`);
  }

  parts.push(`. Photorealistic, sharp focus, high quality, 4K.`);

  return parts.join(' ');
}

// ============================================
// IMAGEN 3 - PERSON REPLACEMENT (Inpainting)
// ============================================

/**
 * Replaces a person in an image with the avatar using Imagen 3 Edit
 * Uses inpainting to swap the person while keeping the background
 */
export async function replacePersonWithAvatar(
  selfieBase64: string,
  selfieMimeType: string,
  avatarBase64: string,
  avatarMimeType: string,
  sceneAnalysis: SceneAnalysis,
  avatarConfig: AvatarConfig
): Promise<string> {
  // Build the edit prompt
  const editPrompt = buildReplacementPrompt(sceneAnalysis, avatarConfig);

  console.log('Replacing person with Imagen 3 Edit...');
  console.log('Edit prompt:', editPrompt.substring(0, 200) + '...');

  const client = await getPredictionClient();

  // Imagen 3 Edit endpoint
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-capability-001`;

  const instance = {
    prompt: editPrompt,
    image: {
      bytesBase64Encoded: selfieBase64,
    },
    // Reference image for the new person
    referenceImages: [{
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: 1,
      referenceImage: {
        bytesBase64Encoded: avatarBase64,
      },
    }],
  };

  const parameters = {
    sampleCount: 1,
    editMode: 'EDIT_MODE_INPAINT_INSERTION',
    safetyFilterLevel: 'block_only_high',
    personGeneration: 'allow_adult',
  };

  const request = {
    endpoint,
    instances: [{ structValue: { fields: toProtobufStruct(instance) } }],
    parameters: { structValue: { fields: toProtobufStruct(parameters) } },
  };

  try {
    const [response] = await client.predict(request);

    const predictions = response.predictions;
    if (!predictions || predictions.length === 0) {
      throw new Error('No image generated by Imagen 3 Edit');
    }

    const prediction = predictions[0];
    const imageBytes = prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;

    if (!imageBytes) {
      throw new Error('No image data in Imagen 3 Edit response');
    }

    return `data:image/png;base64,${imageBytes}`;
  } catch (error: any) {
    console.error('Imagen 3 Edit failed, falling back to generation:', error.message);

    // Fallback: Generate a new image with the avatar in the scene context
    return generateAvatarWithImagen(avatarConfig, sceneAnalysis);
  }
}

/**
 * Builds the replacement/edit prompt
 */
function buildReplacementPrompt(scene: SceneAnalysis, avatar: AvatarConfig): string {
  const parts: string[] = [];

  parts.push(`Replace the person with a ${avatar.gender} ${avatar.ageRange}`);
  parts.push(`with ${avatar.skinTone}, ${avatar.hairStyle}, ${avatar.eyeColor}`);
  parts.push(`${avatar.faceShape}, ${avatar.expression}`);

  if (avatar.facialHair && avatar.facialHair !== '') {
    parts.push(`with ${avatar.facialHair}`);
  }

  parts.push(`. Keep exact same pose (${scene.person.pose})`);
  parts.push(`same ${scene.lighting.type} lighting from ${scene.lighting.direction}`);
  parts.push(`same background: ${scene.background.setting}`);

  return parts.join(' ');
}

// ============================================
// HELPERS
// ============================================

/**
 * Converts a JS object to Protobuf Struct fields format
 */
function toProtobufStruct(obj: any): any {
  const fields: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { numberValue: value };
      } else {
        fields[key] = { numberValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { boolValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        listValue: {
          values: value.map(item => {
            if (typeof item === 'object') {
              return { structValue: { fields: toProtobufStruct(item) } };
            }
            return { stringValue: String(item) };
          }),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { structValue: { fields: toProtobufStruct(value) } };
    }
  }

  return fields;
}

// ============================================
// CLOUD STORAGE HELPERS
// ============================================

/**
 * Uploads a base64 image to Cloud Storage
 */
export async function uploadImageToStorage(
  base64Data: string,
  storagePath: string,
  mimeType: string = 'image/png'
): Promise<string> {
  const storage = await getStorage();

  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
}

/**
 * Downloads an image from URL and converts to base64
 */
export async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return { base64, mimeType: contentType };
}

/**
 * Gets mime type from URL
 */
export function getMimeTypeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}
