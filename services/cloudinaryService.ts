import { Platform } from 'react-native';

const CLOUD_NAME = 'dnrj1guvs';
const UPLOAD_PRESET = 'hidetok-simple';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration: number;
  bytes: number;
  format: string;
  width: number;
  height: number;
}

/**
 * Sube un video a Cloudinary con compresión automática.
 * Cloudinary lo transcodifica, optimiza y sirve por CDN.
 */
export const uploadVideoToCloudinary = async (
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    console.log('☁️ Subiendo video a Cloudinary...');
    console.log('📍 URI:', uri);
    const startTime = Date.now();

    // Crear FormData con el video
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // En web, convertir URI (blob URL) a File
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, 'video.mp4');
    } else {
      // En React Native, usar el patrón { uri, type, name }
      formData.append('file', {
        uri,
        type: 'video/mp4',
        name: 'video.mp4',
      } as any);
    }

    formData.append('upload_preset', UPLOAD_PRESET);

    // Intentar con fetch (más confiable en React Native)
    onProgress?.(5); // Señal de que inició

    console.log('📤 Enviando a Cloudinary con fetch...');
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    onProgress?.(90); // Casi listo

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }

    const result: CloudinaryUploadResult = await response.json();
    onProgress?.(100);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const sizeMB = (result.bytes / (1024 * 1024)).toFixed(1);
    console.log(`✅ Video subido a Cloudinary en ${elapsed}s (${sizeMB}MB)`);
    console.log(`📐 ${result.width}x${result.height}, ${result.format}`);

    // Retornar URL optimizada: 720p, calidad auto, formato auto
    const optimizedUrl = result.secure_url.replace(
      '/upload/',
      '/upload/c_limit,h_720,q_auto,f_mp4/'
    );

    console.log('🔗 URL optimizada:', optimizedUrl);
    return optimizedUrl;
  } catch (error) {
    console.error('❌ Error subiendo a Cloudinary:', error);
    throw error;
  }
};
