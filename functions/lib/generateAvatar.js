"use strict";
/**
 * Avatar Generation Cloud Functions
 *
 * Professional implementation using Vertex AI:
 * - Gemini 1.5 Pro for scene analysis
 * - Imagen 3 for avatar generation
 * - Imagen 3 Edit for person replacement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.avatarReplacement = exports.generateAvatarWithGemini = void 0;
const https_1 = require("firebase-functions/v2/https");
const vertexAI_1 = require("./vertexAI");
// ============================================
// CLOUD FUNCTION: Generate Avatar with Vertex AI
// ============================================
/**
 * Generates a photorealistic avatar using Vertex AI Imagen 3
 *
 * Input: Avatar configuration (gender, skin tone, hair, etc.)
 * Output: Base64 data URL of generated avatar
 */
exports.generateAvatarWithGemini = (0, https_1.onCall)({
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
}, async (request) => {
    // Validate authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { prompt, selections } = request.data;
    // Support both legacy prompt and new selections format
    let avatarConfig;
    if (selections) {
        avatarConfig = {
            gender: selections.gender || 'male',
            skinTone: mapSkinTone(selections.skinTone),
            hairStyle: mapHairStyle(selections.hairStyle),
            ageRange: mapAgeRange(selections.ageRange),
            eyeColor: mapEyeColor(selections.eyeColor),
            faceShape: mapFaceShape(selections.faceShape),
            facialHair: mapFacialHair(selections.facialHair),
            accessories: mapAccessories(selections.accessories),
            expression: mapExpression(selections.expression),
        };
    }
    else if (prompt) {
        // Legacy: parse from prompt string
        avatarConfig = parsePromptToConfig(prompt);
    }
    else {
        throw new https_1.HttpsError('invalid-argument', 'Either prompt or selections required');
    }
    console.log('Generating avatar with Vertex AI...');
    console.log('Config:', JSON.stringify(avatarConfig));
    const startTime = Date.now();
    try {
        const imageDataUrl = await (0, vertexAI_1.generateAvatarWithImagen)(avatarConfig);
        const totalTime = Date.now() - startTime;
        console.log(`Avatar generated in ${totalTime}ms`);
        return { imageUrl: imageDataUrl };
    }
    catch (error) {
        console.error('Avatar generation failed:', error);
        throw new https_1.HttpsError('internal', `Avatar generation failed: ${error.message}`);
    }
});
// ============================================
// CLOUD FUNCTION: Avatar Replacement with Vertex AI
// ============================================
/**
 * Replaces a person in a photo with the user's avatar
 *
 * Pipeline:
 * 1. Analyze selfie with Gemini 1.5 Pro → JSON (pose, lighting, objects)
 * 2. Replace person using Imagen 3 Edit with avatar reference
 *
 * Input: selfieUrl, avatarUrl
 * Output: Base64 data URL of result
 */
exports.avatarReplacement = (0, https_1.onCall)({
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '1GiB',
}, async (request) => {
    // Validate authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { selfieUrl, avatarUrl, avatarSelections } = request.data;
    if (!selfieUrl || typeof selfieUrl !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'selfieUrl is required');
    }
    if (!avatarUrl || typeof avatarUrl !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'avatarUrl is required');
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('     VERTEX AI AVATAR REPLACEMENT (Professional)           ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Selfie URL:', selfieUrl.substring(0, 80) + '...');
    console.log('Avatar URL:', avatarUrl.substring(0, 80) + '...');
    const startTime = Date.now();
    try {
        // Step 1: Download images
        console.log('\n[1/3] Downloading images...');
        const [selfieData, avatarData] = await Promise.all([
            (0, vertexAI_1.urlToBase64)(selfieUrl),
            (0, vertexAI_1.urlToBase64)(avatarUrl),
        ]);
        console.log('    ✓ Images downloaded');
        // Step 2: Analyze scene with Gemini 1.5 Pro
        console.log('\n[2/3] Analyzing scene with Gemini 1.5 Pro...');
        const sceneAnalysis = await (0, vertexAI_1.analyzeSceneWithGemini)(selfieData.base64, selfieData.mimeType);
        console.log('    ✓ Scene analyzed:', JSON.stringify(sceneAnalysis, null, 2).substring(0, 200));
        // Get avatar config from selections or use defaults
        const avatarConfig = avatarSelections ? {
            gender: avatarSelections.gender || 'male',
            skinTone: mapSkinTone(avatarSelections.skinTone),
            hairStyle: mapHairStyle(avatarSelections.hairStyle),
            ageRange: mapAgeRange(avatarSelections.ageRange),
            eyeColor: mapEyeColor(avatarSelections.eyeColor),
            faceShape: mapFaceShape(avatarSelections.faceShape),
            facialHair: mapFacialHair(avatarSelections.facialHair),
            accessories: mapAccessories(avatarSelections.accessories),
            expression: mapExpression(avatarSelections.expression),
        } : {
            gender: 'male',
            skinTone: 'medium skin',
            hairStyle: 'short hair',
            ageRange: 'adult in their 30s',
            eyeColor: 'brown eyes',
            faceShape: 'oval face',
            expression: 'natural expression',
        };
        // Step 3: Replace person with Imagen 3
        console.log('\n[3/3] Replacing person with Vertex AI...');
        const resultImageUrl = await (0, vertexAI_1.replacePersonWithAvatar)(selfieData.base64, selfieData.mimeType, avatarData.base64, avatarData.mimeType, sceneAnalysis, avatarConfig);
        console.log('    ✓ Person replaced');
        const totalTime = Date.now() - startTime;
        console.log(`\n✓ Avatar replacement completed in ${totalTime}ms`);
        return { imageUrl: resultImageUrl };
    }
    catch (error) {
        console.error('Avatar replacement failed:', error);
        throw new https_1.HttpsError('internal', `Avatar replacement failed: ${error.message}`);
    }
});
// ============================================
// MAPPING FUNCTIONS
// ============================================
function mapSkinTone(tone) {
    const map = {
        tone1: 'very light/pale skin',
        tone2: 'light skin',
        tone3: 'medium skin',
        tone4: 'olive/tan skin',
        tone5: 'brown skin',
        tone6: 'dark brown skin',
    };
    return map[tone] || 'medium skin';
}
function mapHairStyle(style) {
    const map = {
        short: 'short cropped hair',
        medium: 'medium-length hair',
        long: 'long flowing hair',
        curly: 'curly textured hair',
        wavy: 'wavy hair',
        bald: 'bald/shaved head',
    };
    return map[style] || 'short hair';
}
function mapAgeRange(age) {
    const map = {
        young: 'young adult in their early 20s',
        adult: 'adult in their 30s-40s',
        senior: 'mature adult in their 50s-60s',
    };
    return map[age] || 'adult';
}
function mapEyeColor(color) {
    const map = {
        brown: 'warm brown eyes',
        blue: 'bright blue eyes',
        green: 'green eyes',
        hazel: 'hazel eyes',
        black: 'dark brown/black eyes',
        gray: 'gray eyes',
    };
    return map[color] || 'brown eyes';
}
function mapFaceShape(shape) {
    const map = {
        oval: 'oval face shape',
        round: 'round face shape',
        angular: 'angular/chiseled face',
        long: 'elongated face',
        square: 'square jaw face',
    };
    return map[shape] || 'oval face';
}
function mapFacialHair(hair) {
    const map = {
        none: '',
        stubble: 'light stubble',
        full_beard: 'full beard',
        mustache: 'mustache',
        goatee: 'goatee',
    };
    return map[hair] || '';
}
function mapAccessories(acc) {
    const map = {
        none: '',
        glasses: 'wearing glasses',
        sunglasses: 'wearing sunglasses',
        earrings: 'wearing earrings',
        cap: 'wearing a cap',
        headscarf: 'wearing a headscarf',
        piercing: 'with facial piercings',
    };
    return map[acc] || '';
}
function mapExpression(exp) {
    const map = {
        smile: 'warm genuine smile',
        serious: 'serious confident look',
        relaxed: 'relaxed calm expression',
        confident: 'confident smirk',
        mysterious: 'mysterious gaze',
    };
    return map[exp] || 'natural expression';
}
/**
 * Parses a legacy prompt string into avatar config
 */
function parsePromptToConfig(prompt) {
    const lower = prompt.toLowerCase();
    return {
        gender: lower.includes('female') ? 'female' : lower.includes('male') ? 'male' : 'person',
        skinTone: 'medium skin',
        hairStyle: lower.includes('long hair') ? 'long hair' :
            lower.includes('curly') ? 'curly hair' :
                lower.includes('bald') ? 'bald' : 'short hair',
        ageRange: lower.includes('young') ? 'young adult in their 20s' :
            lower.includes('senior') || lower.includes('50') ? 'mature adult' : 'adult in their 30s',
        eyeColor: lower.includes('blue eye') ? 'blue eyes' :
            lower.includes('green eye') ? 'green eyes' : 'brown eyes',
        faceShape: 'oval face',
        expression: lower.includes('smile') ? 'warm smile' :
            lower.includes('serious') ? 'serious look' : 'natural expression',
    };
}
//# sourceMappingURL=generateAvatar.js.map