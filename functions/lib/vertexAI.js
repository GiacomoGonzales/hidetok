"use strict";
/**
 * AI Integration for Avatar Generation & Person Replacement
 *
 * Architecture:
 * - Gemini 2.5 Flash Image (API key): Avatar generation + Person replacement
 *   Uses generateContent with both images as input (like the Gemini chatbot)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAvatarWithImagen = generateAvatarWithImagen;
exports.replacePersonWithAvatar = replacePersonWithAvatar;
exports.uploadImageToStorage = uploadImageToStorage;
exports.urlToBase64 = urlToBase64;
exports.getMimeTypeFromUrl = getMimeTypeFromUrl;
// sharp is lazy-loaded to avoid deployment timeout
// Project configuration
const BUCKET_NAME = 'hidetok-9a642.firebasestorage.app';
// Max image dimension before sending to Gemini (pixels)
const MAX_IMAGE_DIMENSION = 1024;
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
// Gemini API (API key) - for avatar generation + person replacement
async function getGenAI() {
    if (!genAIInstance) {
        const { GoogleGenAI } = await Promise.resolve().then(() => require('@google/genai'));
        genAIInstance = new GoogleGenAI({ apiKey: getGeminiApiKey() });
        console.log('Google GenAI (API key) initialized');
    }
    return genAIInstance;
}
/**
 * Compresses and resizes a base64 image using sharp.
 * Returns a smaller base64 string suitable for the Gemini API.
 */
async function compressImageBase64(base64Data, mimeType) {
    const inputBuffer = Buffer.from(base64Data, 'base64');
    const originalSizeKB = Math.round(inputBuffer.length / 1024);
    const sharpModule = await Promise.resolve().then(() => require('sharp'));
    const sharpFn = sharpModule.default || sharpModule;
    const outputBuffer = await sharpFn(inputBuffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
    })
        .jpeg({ quality: 80 })
        .toBuffer();
    const compressedSizeKB = Math.round(outputBuffer.length / 1024);
    console.log(`  Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB`);
    return {
        base64: outputBuffer.toString('base64'),
        mimeType: 'image/jpeg',
    };
}
/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve in time.
 */
function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms / 1000}s`));
        }, ms);
        promise.then((val) => { clearTimeout(timer); resolve(val); }, (err) => { clearTimeout(timer); reject(err); });
    });
}
// ============================================
// AVATAR GENERATION
// ============================================
/**
 * Generates an avatar image using Gemini 2.5 Flash Image
 */
async function generateAvatarWithImagen(avatarConfig) {
    var _a, _b;
    const prompt = buildAvatarPrompt(avatarConfig);
    console.log('Generating avatar with Gemini 2.5 Flash Image...');
    console.log('Prompt:', prompt.substring(0, 200) + '...');
    const ai = await getGenAI();
    const startMs = Date.now();
    console.log('Calling Gemini generateContent for avatar...');
    let response;
    try {
        response = await withTimeout(ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseModalities: ['IMAGE', 'TEXT'],
            },
        }), 90000, // 90s timeout (function has 120s total)
        'Avatar generation');
    }
    catch (err) {
        console.error('Gemini generateContent failed:', err.message || err);
        throw err;
    }
    const elapsed = Date.now() - startMs;
    console.log(`Gemini responded in ${elapsed}ms`);
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        console.error('Gemini response had no candidates:', JSON.stringify(response).substring(0, 500));
        throw new Error('No candidates in Gemini response');
    }
    const parts = (_a = candidates[0].content) === null || _a === void 0 ? void 0 : _a.parts;
    if (!parts) {
        console.error('Gemini response had no parts:', JSON.stringify(candidates[0]).substring(0, 500));
        throw new Error('No parts in Gemini response');
    }
    for (const part of parts) {
        if ((_b = part.inlineData) === null || _b === void 0 ? void 0 : _b.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            console.log('Avatar image generated successfully');
            return `data:${mimeType};base64,${part.inlineData.data}`;
        }
    }
    // Log text responses for debugging
    for (const part of parts) {
        if (part.text) {
            console.error('Gemini returned text instead of image:', part.text);
        }
    }
    throw new Error('No image data in Gemini response');
}
/**
 * Builds a detailed prompt for avatar generation
 */
function buildAvatarPrompt(config) {
    const parts = [];
    parts.push(`Portrait photo of a ${config.ageRange} ${config.gender}`);
    parts.push(`with ${config.skinTone}`);
    parts.push(`${config.hairStyle}`);
    if (config.hairColor)
        parts.push(`(${config.hairColor})`);
    parts.push(`${config.eyeColor}`);
    parts.push(`${config.faceShape}`);
    if (config.facialHair && config.facialHair !== '') {
        parts.push(`with ${config.facialHair}`);
    }
    parts.push(`${config.expression}`);
    if (config.accessories && config.accessories !== '') {
        parts.push(`${config.accessories}`);
    }
    if (config.clothing) {
        parts.push(`wearing ${config.clothing}`);
    }
    parts.push(`. Plain white background. Shot with a high-end smartphone camera.`);
    parts.push(`Photorealistic, natural skin texture with visible pores and subtle imperfections, natural lighting, no filters, no AI artifacts, 4K quality.`);
    return parts.join(' ');
}
// ============================================
// PERSON REPLACEMENT (Gemini 2.5 Flash Image - same as Gemini chatbot)
// ============================================
/**
 * Replaces a person in a photo with the avatar using Gemini 2.5 Flash Image.
 * Sends both images to generateContent with a simple prompt - the same approach
 * that works in the Gemini chatbot.
 */
async function replacePersonWithAvatar(selfieBase64, selfieMimeType, avatarBase64, avatarMimeType) {
    var _a, _b;
    console.log('Replacing person with Gemini 2.5 Flash Image (generateContent)...');
    console.log(`  Selfie original: ${selfieBase64.length} chars (${selfieMimeType})`);
    console.log(`  Avatar original: ${avatarBase64.length} chars (${avatarMimeType})`);
    // Compress images before sending to Gemini
    console.log('  Compressing selfie...');
    const compressedSelfie = await compressImageBase64(selfieBase64, selfieMimeType);
    console.log('  Compressing avatar...');
    const compressedAvatar = await compressImageBase64(avatarBase64, avatarMimeType);
    console.log(`  Selfie compressed: ${compressedSelfie.base64.length} chars`);
    console.log(`  Avatar compressed: ${compressedAvatar.base64.length} chars`);
    const ai = await getGenAI();
    const startMs = Date.now();
    console.log('Calling Gemini generateContent for person replacement...');
    let response;
    try {
        response = await withTimeout(ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: compressedSelfie.mimeType,
                                data: compressedSelfie.base64,
                            },
                        },
                        {
                            inlineData: {
                                mimeType: compressedAvatar.mimeType,
                                data: compressedAvatar.base64,
                            },
                        },
                        {
                            text: 'Replace the person in the first photo with the person from the second photo. Keep the same pose, scene, background, and lighting. The result should look like a natural, real photograph.',
                        },
                    ],
                },
            ],
            config: {
                responseModalities: ['IMAGE', 'TEXT'],
            },
        }), 240000, // 240s timeout (function has 300s total)
        'Person replacement');
    }
    catch (err) {
        console.error('Gemini generateContent failed:', err.message || err);
        throw err;
    }
    const elapsed = Date.now() - startMs;
    console.log(`Gemini responded in ${elapsed}ms`);
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        console.error('Gemini response had no candidates:', JSON.stringify(response).substring(0, 500));
        throw new Error('No candidates in Gemini response');
    }
    const parts = (_a = candidates[0].content) === null || _a === void 0 ? void 0 : _a.parts;
    if (!parts) {
        console.error('Gemini response had no parts:', JSON.stringify(candidates[0]).substring(0, 500));
        throw new Error('No parts in Gemini response');
    }
    for (const part of parts) {
        if ((_b = part.inlineData) === null || _b === void 0 ? void 0 : _b.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            console.log('Person replacement succeeded with Gemini 2.5 Flash Image');
            return `data:${mimeType};base64,${part.inlineData.data}`;
        }
    }
    // Log any text response for debugging
    for (const part of parts) {
        if (part.text) {
            console.error('Gemini returned text instead of image:', part.text);
        }
    }
    throw new Error('No image data in Gemini response - model may have refused the request');
}
// ============================================
// CLOUD STORAGE HELPERS
// ============================================
/**
 * Uploads a base64 image to Cloud Storage using Firebase Admin SDK
 * Returns a Firebase Storage download URL with token
 */
async function uploadImageToStorage(base64Data, storagePath, mimeType = 'image/png') {
    const admin = await Promise.resolve().then(() => require('firebase-admin'));
    const { v4: uuidv4 } = await Promise.resolve().then(() => require('uuid'));
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const downloadToken = uuidv4();
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const file = bucket.file(storagePath);
    await file.save(buffer, {
        metadata: {
            contentType: mimeType,
            metadata: {
                firebaseStorageDownloadTokens: downloadToken,
            },
        },
    });
    const encodedPath = encodeURIComponent(storagePath);
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
/**
 * Downloads an image from URL and converts to base64
 * Also handles data URLs (base64 already embedded)
 */
async function urlToBase64(url) {
    // Handle data URLs directly
    if (url.startsWith('data:')) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            return { mimeType: match[1], base64: match[2] };
        }
        throw new Error('Invalid data URL format');
    }
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