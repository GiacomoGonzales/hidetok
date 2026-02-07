"use strict";
/**
 * AI Integration for Professional Avatar Generation
 *
 * Architecture:
 * - Gemini 2.5 Flash (text): Scene analysis - the "Brain" (pose, lighting, objects, hands, interactions)
 * - Imagen 3: Image generation - the "Painter" (stable, photorealistic avatar generation)
 * - Gemini 2.5 Flash Image: Person replacement - the "Surgeon" (multi-modal replacement)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSceneWithGemini = analyzeSceneWithGemini;
exports.generateAvatarWithImagen = generateAvatarWithImagen;
exports.replacePersonWithAvatar = replacePersonWithAvatar;
exports.uploadImageToStorage = uploadImageToStorage;
exports.urlToBase64 = urlToBase64;
exports.getMimeTypeFromUrl = getMimeTypeFromUrl;
// Project configuration
const BUCKET_NAME = 'hidetok-9a642.firebasestorage.app';
// Get API key from environment
function getGeminiApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY not configured in environment');
    }
    return key;
}
// Lazy-loaded clients
let genAIInstance = null;
let storageInstance = null;
async function getGenAI() {
    if (!genAIInstance) {
        const { GoogleGenAI } = await Promise.resolve().then(() => require('@google/genai'));
        genAIInstance = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        console.log('Google GenAI initialized');
    }
    return genAIInstance;
}
async function getStorage() {
    if (!storageInstance) {
        const { Storage } = await Promise.resolve().then(() => require('@google-cloud/storage'));
        storageInstance = new Storage();
        console.log('Cloud Storage initialized');
    }
    return storageInstance;
}
// ============================================
// GEMINI 2.5 FLASH - SCENE ANALYSIS (Brain)
// ============================================
/**
 * Analyzes a selfie image and extracts detailed scene information
 * Uses Gemini 2.5 Flash (text) for fast, accurate analysis
 */
async function analyzeSceneWithGemini(imageBase64, mimeType) {
    const ai = await getGenAI();
    const prompt = `Analyze this image and extract detailed information in JSON format.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "person": {
    "gender": "male/female/unknown",
    "clothing": "description of what they're wearing",
    "accessories": ["list", "of", "accessories"],
    "pose": "standing/sitting/leaning/crouching/etc",
    "bodyPosition": "detailed description of body orientation and limb positions",
    "handPositions": "exact position of each hand (e.g. 'left hand holding phone near face, right hand resting on hip')",
    "objectInteractions": ["list of objects the person is touching, holding, leaning on, or interacting with"],
    "facialOrientation": "direction the face is looking (e.g. 'looking directly at camera', 'looking left and slightly down', '3/4 view facing right')"
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
}

Pay special attention to:
- Hand positions: describe exactly where each hand is and what it's doing
- Object interactions: list every object the person is touching, holding, or physically interacting with
- Facial orientation: precise direction the face and eyes are pointing`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: imageBase64,
                        },
                    },
                ],
            },
        ],
    });
    const text = response.text || '';
    // Clean and parse JSON
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
    }
    try {
        return JSON.parse(jsonStr);
    }
    catch (error) {
        console.error('Failed to parse scene analysis:', text);
        return {
            person: {
                gender: 'unknown',
                clothing: 'casual clothing',
                accessories: [],
                pose: 'standing',
                bodyPosition: 'facing camera',
                handPositions: 'hands at sides',
                objectInteractions: [],
                facialOrientation: 'looking directly at camera',
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
 * Generates an avatar image using Gemini 2.5 Flash Image
 */
async function generateAvatarWithImagen(avatarConfig, sceneContext) {
    var _a, _b;
    const prompt = buildAvatarPrompt(avatarConfig, sceneContext);
    console.log('Generating avatar with Gemini 2.5 Flash Image...');
    console.log('Prompt:', prompt.substring(0, 200) + '...');
    const ai = await getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error('No candidates in Gemini response');
    }
    const parts = (_a = candidates[0].content) === null || _a === void 0 ? void 0 : _a.parts;
    if (!parts) {
        throw new Error('No parts in Gemini response');
    }
    for (const part of parts) {
        if ((_b = part.inlineData) === null || _b === void 0 ? void 0 : _b.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error('No image data in Gemini response');
}
/**
 * Builds a detailed prompt for avatar generation
 */
function buildAvatarPrompt(config, scene) {
    const parts = [];
    // Base description - optimized for Imagen 3
    parts.push(`Professional portrait photograph of a fictional ${config.ageRange} ${config.gender}`);
    // Physical features
    parts.push(`with ${config.skinTone}`);
    parts.push(`${config.hairStyle}`);
    if (config.hairColor)
        parts.push(`(${config.hairColor})`);
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
    }
    else {
        parts.push(`. Natural selfie style, smartphone front camera, soft natural lighting`);
    }
    parts.push(`. Photorealistic, sharp focus, high quality, 4K.`);
    return parts.join(' ');
}
// ============================================
// GEMINI 2.5 FLASH IMAGE - PERSON REPLACEMENT
// ============================================
/**
 * Builds the detailed replacement prompt for Gemini 2.5 Flash Image
 */
function buildGeminiReplacementPrompt(scene, avatar) {
    // Build avatar identity description
    const identityParts = [];
    identityParts.push(`a ${avatar.ageRange} ${avatar.gender}`);
    identityParts.push(`with ${avatar.skinTone}, ${avatar.hairStyle}, ${avatar.eyeColor}, ${avatar.faceShape}`);
    if (avatar.facialHair && avatar.facialHair !== '') {
        identityParts.push(`with ${avatar.facialHair}`);
    }
    identityParts.push(`showing ${avatar.expression}`);
    const identityDesc = identityParts.join(' ');
    return `You are given two images:
- Image B (first image): A portrait/avatar of a person. This is the IDENTITY to use.
- Image A (second image): A photo with a person in a scene. This is the SCENE to preserve.

Your task: Generate a new image that replaces the person in Image A with the person from Image B, while preserving EVERYTHING else from Image A.

IDENTITY (from Image B / avatar description): ${identityDesc}

CRITICAL PRESERVATION RULES:
1. POSE & BODY: Keep the exact same pose (${scene.person.pose}), body position (${scene.person.bodyPosition}), and clothing (${scene.person.clothing}).
2. HANDS: Preserve hand positions exactly: ${scene.person.handPositions}. If hands are holding or touching objects, keep the interaction intact.
3. OBJECT INTERACTIONS: The person is interacting with: [${scene.person.objectInteractions.join(', ')}]. These interactions MUST be preserved in the output.
4. FACE DIRECTION: The face should be oriented: ${scene.person.facialOrientation}.
5. LIGHTING: Maintain ${scene.lighting.type} lighting from ${scene.lighting.direction}, ${scene.lighting.intensity} intensity, ${scene.lighting.color} color temperature.
6. CAMERA: Keep ${scene.camera.angle} angle, ${scene.camera.distance} distance, ${scene.camera.framing} framing.
7. BACKGROUND: Preserve the background exactly: ${scene.background.setting}. Objects: [${scene.background.objects.join(', ')}].
8. ASPECT RATIO: Keep the same dimensions and aspect ratio as Image A.

OUTPUT: A single photorealistic image with the person from Image B placed naturally into Image A's scene, matching all the above rules.`;
}
/**
 * Replaces a person in a photo using Gemini 2.5 Flash Image (multi-modal)
 * Sends avatar + selfie and generates the replacement directly
 */
async function replacePersonWithGeminiImage(selfieBase64, selfieMimeType, avatarBase64, avatarMimeType, sceneAnalysis, avatarConfig) {
    var _a, _b;
    const ai = await getGenAI();
    const prompt = buildGeminiReplacementPrompt(sceneAnalysis, avatarConfig);
    console.log('Replacing person with Gemini 2.5 Flash Image...');
    console.log('Replacement prompt:', prompt.substring(0, 200) + '...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [
            {
                role: 'user',
                parts: [
                    // Avatar (Image B) first - to establish identity
                    {
                        inlineData: {
                            mimeType: avatarMimeType,
                            data: avatarBase64,
                        },
                    },
                    // Selfie (Image A) second - to preserve aspect ratio
                    {
                        inlineData: {
                            mimeType: selfieMimeType,
                            data: selfieBase64,
                        },
                    },
                    { text: prompt },
                ],
            },
        ],
        config: {
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });
    // Extract image from response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error('No candidates in Gemini 2.5 Flash Image response');
    }
    const parts = (_a = candidates[0].content) === null || _a === void 0 ? void 0 : _a.parts;
    if (!parts) {
        throw new Error('No parts in Gemini 2.5 Flash Image response');
    }
    for (const part of parts) {
        if ((_b = part.inlineData) === null || _b === void 0 ? void 0 : _b.data) {
            const imgMimeType = part.inlineData.mimeType || 'image/png';
            return `data:${imgMimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error('No image data found in Gemini 2.5 Flash Image response');
}
// ============================================
// IMAGEN 3 EDIT - LEGACY PERSON REPLACEMENT
// ============================================
/**
 * Replaces a person in an image with the avatar using Imagen 3 Edit (legacy)
 * Uses inpainting via Google GenAI SDK
 */
async function replacePersonWithImagen3Edit(selfieBase64, selfieMimeType, avatarBase64, avatarMimeType, sceneAnalysis, avatarConfig) {
    var _a;
    const editPrompt = buildReplacementPromptLegacy(sceneAnalysis, avatarConfig);
    console.log('Replacing person with Imagen 3 Edit (legacy fallback)...');
    console.log('Edit prompt:', editPrompt.substring(0, 200) + '...');
    const ai = await getGenAI();
    const response = await ai.models.editImage({
        model: 'imagen-3.0-capability-001',
        prompt: editPrompt,
        image: {
            bytesBase64Encoded: selfieBase64,
            mimeType: selfieMimeType,
        },
        referenceImages: [{
                referenceType: 'REFERENCE_TYPE_SUBJECT',
                referenceId: 1,
                referenceImage: {
                    image: {
                        bytesBase64Encoded: avatarBase64,
                        mimeType: avatarMimeType,
                    },
                },
            }],
        config: {
            editMode: 'EDIT_MODE_INPAINT_INSERTION',
            numberOfImages: 1,
            safetyFilterLevel: 'BLOCK_ONLY_HIGH',
            personGeneration: 'ALLOW_ADULT',
        },
    });
    const generatedImages = response.generatedImages;
    if (!generatedImages || generatedImages.length === 0) {
        throw new Error('No image generated by Imagen 3 Edit');
    }
    const imageBytes = (_a = generatedImages[0].image) === null || _a === void 0 ? void 0 : _a.imageBytes;
    if (!imageBytes) {
        throw new Error('No image data in Imagen 3 Edit response');
    }
    return `data:image/png;base64,${imageBytes}`;
}
/**
 * Builds the replacement/edit prompt for Imagen 3 Edit (legacy)
 */
function buildReplacementPromptLegacy(scene, avatar) {
    const parts = [];
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
// PUBLIC REPLACEMENT FUNCTION (with fallbacks)
// ============================================
/**
 * Replaces a person in an image with the avatar
 *
 * Strategy:
 * 1. Primary: Gemini 2.5 Flash Image (multi-modal, best quality)
 * 2. Fallback 1: Imagen 3 Edit (legacy inpainting)
 * 3. Fallback 2: Generate avatar standalone with scene context
 */
async function replacePersonWithAvatar(selfieBase64, selfieMimeType, avatarBase64, avatarMimeType, sceneAnalysis, avatarConfig) {
    // Primary: Gemini 2.5 Flash Image
    try {
        const result = await replacePersonWithGeminiImage(selfieBase64, selfieMimeType, avatarBase64, avatarMimeType, sceneAnalysis, avatarConfig);
        console.log('Person replaced successfully with Gemini 2.5 Flash Image');
        return result;
    }
    catch (error) {
        console.error('Gemini 2.5 Flash Image failed:', error.message);
    }
    // Fallback 1: Imagen 3 Edit
    try {
        const result = await replacePersonWithImagen3Edit(selfieBase64, selfieMimeType, avatarBase64, avatarMimeType, sceneAnalysis, avatarConfig);
        console.log('Person replaced with Imagen 3 Edit (fallback 1)');
        return result;
    }
    catch (error) {
        console.error('Imagen 3 Edit also failed:', error.message);
    }
    // Fallback 2: Generate avatar standalone with scene context
    console.log('All replacement methods failed, generating avatar with scene context (fallback 2)');
    return generateAvatarWithImagen(avatarConfig, sceneAnalysis);
}
// ============================================
// CLOUD STORAGE HELPERS
// ============================================
/**
 * Uploads a base64 image to Cloud Storage
 */
async function uploadImageToStorage(base64Data, storagePath, mimeType = 'image/png') {
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
async function urlToBase64(url) {
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
function getMimeTypeFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('.png'))
        return 'image/png';
    if (lower.includes('.webp'))
        return 'image/webp';
    if (lower.includes('.gif'))
        return 'image/gif';
    return 'image/jpeg';
}
//# sourceMappingURL=vertexAI.js.map