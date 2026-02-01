"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faceSwap = exports.generateAvatarFullBody = exports.generateAvatarPortrait = void 0;
const https_1 = require("firebase-functions/v2/https");
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
async function callReplicate(prompt, aspectRatio) {
    var _a;
    const apiToken = REPLICATE_API_TOKEN;
    if (!apiToken) {
        throw new https_1.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    const makeRequest = async () => {
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
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
            });
            if (res.status === 429) {
                const retryAfter = parseInt(res.headers.get('retry-after') || '15', 10);
                console.log(`Rate limited, retrying in ${retryAfter}s (attempt ${attempt + 1})`);
                await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            return res;
        }
        throw new https_1.HttpsError('resource-exhausted', 'Rate limited by image generation API');
    };
    const createResponse = await makeRequest();
    if (!createResponse.ok) {
        const errorBody = await createResponse.text();
        console.error('Replicate create error:', errorBody);
        throw new https_1.HttpsError('internal', 'Failed to create prediction');
    }
    const prediction = await createResponse.json();
    const getUrl = (_a = prediction.urls) === null || _a === void 0 ? void 0 : _a.get;
    if (!getUrl) {
        throw new https_1.HttpsError('internal', 'No polling URL returned from Replicate');
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
        const result = await pollResponse.json();
        if (result.status === 'succeeded') {
            const output = Array.isArray(result.output)
                ? result.output[0]
                : result.output;
            if (!output) {
                throw new https_1.HttpsError('internal', 'Prediction succeeded but no output URL');
            }
            return output;
        }
        if (result.status === 'failed' || result.status === 'canceled') {
            throw new https_1.HttpsError('internal', result.error || 'Prediction failed');
        }
    }
    throw new https_1.HttpsError('deadline-exceeded', 'Avatar generation timed out');
}
exports.generateAvatarPortrait = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 120, memory: '256MiB' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { prompt } = request.data;
    if (!prompt || typeof prompt !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'prompt is required');
    }
    const imageUrl = await callReplicate(prompt, '1:1');
    return { imageUrl };
});
exports.generateAvatarFullBody = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 120, memory: '256MiB' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { prompt } = request.data;
    if (!prompt || typeof prompt !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'prompt is required');
    }
    const imageUrl = await callReplicate(prompt, '2:3');
    return { imageUrl };
});
// --- Face Swap ---
async function callReplicateFaceSwap(sourceImageUrl, swapFaceUrl) {
    var _a;
    const apiToken = REPLICATE_API_TOKEN;
    if (!apiToken) {
        throw new https_1.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    // easel/advanced-face-swap: replaces full head (face + hair + skin tone)
    // hair_source: "user" = keep hair from swap_image (the avatar)
    const input = {
        target_image: sourceImageUrl,
        swap_image: swapFaceUrl,
        hair_source: 'user',
    };
    console.log('Face swap input:', JSON.stringify({
        target_image: sourceImageUrl.substring(0, 80),
        swap_image: swapFaceUrl.substring(0, 80),
        hair_source: 'user',
    }));
    const maxRetries = 3;
    let createResponse = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const res = await fetch('https://api.replicate.com/v1/models/easel/advanced-face-swap/predictions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input }),
        });
        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('retry-after') || '15', 10);
            console.log(`Rate limited, retrying in ${retryAfter}s (attempt ${attempt + 1})`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            continue;
        }
        createResponse = res;
        break;
    }
    if (!createResponse) {
        throw new https_1.HttpsError('resource-exhausted', 'Rate limited by face swap API');
    }
    if (!createResponse.ok) {
        const errorBody = await createResponse.text();
        console.error('Face swap create error:', createResponse.status, errorBody);
        throw new https_1.HttpsError('internal', 'Failed to create face swap prediction');
    }
    const prediction = await createResponse.json();
    console.log('Face swap prediction created:', prediction.id, 'status:', prediction.status);
    // If result came back immediately
    if (prediction.status === 'succeeded' && prediction.output) {
        const output = Array.isArray(prediction.output)
            ? prediction.output[0]
            : prediction.output;
        if (output)
            return output;
    }
    const getUrl = (_a = prediction.urls) === null || _a === void 0 ? void 0 : _a.get;
    if (!getUrl) {
        console.error('No polling URL. Full response:', JSON.stringify(prediction));
        throw new https_1.HttpsError('internal', 'No polling URL returned from Replicate');
    }
    // Poll for result (max ~8 min, every 3s) — easel model has long cold starts
    const maxAttempts = 160;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const pollResponse = await fetch(getUrl, {
            headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (!pollResponse.ok) {
            console.log(`Poll attempt ${i + 1} failed: ${pollResponse.status}`);
            continue;
        }
        const result = await pollResponse.json();
        if (i % 10 === 0) {
            console.log(`Poll attempt ${i + 1}: status=${result.status}`);
        }
        if (result.status === 'succeeded') {
            console.log(`Face swap succeeded after ${(i + 1) * 3}s`);
            const output = Array.isArray(result.output)
                ? result.output[0]
                : result.output;
            if (!output) {
                throw new https_1.HttpsError('internal', 'Face swap succeeded but no output URL');
            }
            return output;
        }
        if (result.status === 'failed' || result.status === 'canceled') {
            console.error('Face swap failed:', result.error);
            throw new https_1.HttpsError('internal', result.error || 'Face swap failed');
        }
    }
    throw new https_1.HttpsError('deadline-exceeded', 'Face swap timed out');
}
exports.faceSwap = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 540, memory: '256MiB' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { sourceImageUrl, swapFaceUrl } = request.data;
    if (!sourceImageUrl || typeof sourceImageUrl !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'sourceImageUrl is required');
    }
    if (!swapFaceUrl || typeof swapFaceUrl !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'swapFaceUrl is required');
    }
    const resultUrl = await callReplicateFaceSwap(sourceImageUrl, swapFaceUrl);
    return { imageUrl: resultUrl };
});
//# sourceMappingURL=generateAvatar.js.map