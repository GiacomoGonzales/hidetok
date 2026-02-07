import { httpsCallable } from 'firebase/functions';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { functions, storage } from '../config/firebase';
import { usersService } from './firestoreService';

// --- Prompt builders ---

interface AvatarSelections {
  gender: string;
  skinTone: string;
  hairStyle: string;
  ageRange: string;
  eyeColor: string;
  faceShape: string;
  facialHair: string;
  accessories: string;
  expression: string;
  background: string;
  photoStyle: string;
}

const GENDER_MAP: Record<string, string> = {
  male: 'male',
  female: 'female',
  other: 'androgynous',
};

const SKIN_TONE_MAP: Record<string, string> = {
  tone1: 'very light skin',
  tone2: 'light skin',
  tone3: 'medium skin',
  tone4: 'olive skin',
  tone5: 'brown skin',
  tone6: 'dark skin',
};

const HAIR_STYLE_MAP: Record<string, string> = {
  short: 'short hair',
  medium: 'medium-length hair',
  long: 'long hair',
  curly: 'curly hair',
  wavy: 'wavy hair',
  bald: 'bald head',
};

const AGE_RANGE_MAP: Record<string, string> = {
  young: 'young adult in their 20s',
  adult: 'adult in their 30s-40s',
  senior: 'mature adult in their 50s-60s',
};

const EYE_COLOR_MAP: Record<string, string> = {
  brown: 'brown eyes',
  blue: 'blue eyes',
  green: 'green eyes',
  hazel: 'hazel eyes',
  black: 'dark brown almost black eyes',
  gray: 'gray eyes',
};

const FACE_SHAPE_MAP: Record<string, string> = {
  oval: 'oval face shape',
  round: 'round face shape',
  angular: 'angular chiseled face shape',
  long: 'elongated face shape',
  square: 'square jawline face shape',
};

const FACIAL_HAIR_MAP: Record<string, string> = {
  none: '',
  stubble: 'light stubble facial hair',
  full_beard: 'full thick beard',
  mustache: 'mustache',
  goatee: 'goatee beard',
};

const ACCESSORIES_MAP: Record<string, string> = {
  none: '',
  glasses: 'wearing prescription glasses',
  sunglasses: 'wearing sunglasses',
  earrings: 'wearing earrings',
  cap: 'wearing a baseball cap',
  headscarf: 'wearing a headscarf',
  piercing: 'with a nose piercing',
};

const EXPRESSION_MAP: Record<string, string> = {
  smile: 'warm genuine smile',
  serious: 'serious confident look',
  relaxed: 'relaxed calm expression',
  confident: 'confident self-assured smirk',
  mysterious: 'enigmatic mysterious gaze',
};

const BACKGROUND_MAP: Record<string, string> = {
  cafe: 'cozy coffee shop interior with warm lighting',
  park: 'lush green park with trees and natural light',
  city: 'urban city street with buildings in the background',
  beach: 'sandy beach with ocean waves in the background',
  indoor: 'modern minimalist room with soft natural window light',
  sunset: 'golden hour sunset with warm orange and pink sky',
};

const PHOTO_STYLE_MAP: Record<string, string> = {
  natural: 'natural iPhone selfie photo, no filters, realistic skin texture with pores and subtle imperfections',
  cinematic: 'cinematic color grading, dramatic lighting, film grain, anamorphic lens flare',
  editorial: 'high fashion editorial photography, sharp focus, magazine quality lighting',
  vintage: 'vintage film photography, warm faded tones, soft grain, retro color palette',
  moody: 'moody dramatic portrait, deep shadows, high contrast, desaturated tones',
};

function buildPortraitPrompt(selections: AvatarSelections): string {
  const gender = GENDER_MAP[selections.gender] || 'person';
  const skin = SKIN_TONE_MAP[selections.skinTone] || 'medium skin';
  const hair = HAIR_STYLE_MAP[selections.hairStyle] || 'short hair';
  const age = AGE_RANGE_MAP[selections.ageRange] || 'adult';
  const eyes = EYE_COLOR_MAP[selections.eyeColor] || 'brown eyes';
  const face = FACE_SHAPE_MAP[selections.faceShape] || '';
  const facialHair = FACIAL_HAIR_MAP[selections.facialHair] || '';
  const accessories = ACCESSORIES_MAP[selections.accessories] || '';
  const expression = EXPRESSION_MAP[selections.expression] || 'natural expression';
  const background = BACKGROUND_MAP[selections.background] || 'blurred everyday location';
  const style = PHOTO_STYLE_MAP[selections.photoStyle] || 'natural photo';

  const details = [face, facialHair, accessories].filter(Boolean).join(', ');

  return `Casual selfie photo of a ${gender} ${age} with ${skin}, ${hair}, ${eyes}${details ? `, ${details}` : ''}. ${expression}, taken with a smartphone front camera, shot from slightly above at arm's length. Background: ${background}. ${style}, shallow depth of field, 4K quality.`;
}

// --- API calls ---

// Generate avatar using Gemini AI
// Cloud function now returns a public Storage URL (not data URL)
export async function generateAvatarWithGemini(
  selections: AvatarSelections
): Promise<string> {
  if (!functions) {
    throw new Error('Firebase functions not initialized');
  }
  const prompt = buildPortraitPrompt(selections);
  console.log('Calling generateAvatarWithGemini with selections:', JSON.stringify(selections).substring(0, 100));

  const callable = httpsCallable<{ prompt: string; selections: AvatarSelections }, { imageUrl: string }>(
    functions,
    'generateAvatarWithGemini',
    { timeout: 120_000 }
  );
  const result = await callable({ prompt, selections });
  return result.data.imageUrl; // Returns public Storage URL
}

// --- Avatar Replacement ---

// Cloud function now returns a public Storage URL (not data URL)
export async function performAvatarReplacement(
  selfieUrl: string,
  avatarUrl: string,
  avatarSelections?: AvatarSelections
): Promise<string> {
  if (!functions) {
    throw new Error('Firebase functions not initialized');
  }
  console.log('Calling avatarReplacement cloud function...');
  const callable = httpsCallable<
    { selfieUrl: string; avatarUrl: string; avatarSelections?: AvatarSelections },
    { imageUrl: string }
  >(functions, 'avatarReplacement', { timeout: 300_000 });
  const result = await callable({ selfieUrl, avatarUrl, avatarSelections });
  return result.data.imageUrl; // Returns public Storage URL
}

// --- Upload helpers ---

// Upload selfie for face swap using base64 (no blobs)
export async function uploadImageForSwap(
  userId: string,
  imageUri: string,
  base64Data?: string | null
): Promise<string> {
  const timestamp = Date.now();
  const storagePath = `users/${userId}/face-swap/source_${timestamp}.jpg`;
  const storageRef = ref(storage, storagePath);

  let base64 = base64Data;
  if (!base64) {
    base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

// Save face swap result - now receives a URL, just returns it
export async function saveFaceSwapResult(
  userId: string,
  resultUrl: string
): Promise<string> {
  // Cloud function already saved to Storage, just return the URL
  return resultUrl;
}

// --- Save to Storage + Firestore ---

// Save generated avatar - now receives a public URL from cloud function
export async function saveGeneratedAvatar(
  userId: string,
  userDocId: string,
  imageUrl: string,
  selections: AvatarSelections
): Promise<{ avatarUrl: string }> {
  // Cloud function already uploaded to Storage, imageUrl is a public URL
  // Just save to Firestore
  await usersService.update(userDocId, {
    aiAvatarPortraitUrl: imageUrl,
    aiAvatarSelections: selections,
  });

  return { avatarUrl: imageUrl };
}
