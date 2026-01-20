import { Platform } from 'react-native';
import imageCompression from 'browser-image-compression';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageOptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number; // 0-1
  useWebWorker?: boolean;
}

/**
 * Convierte URI/Blob a File object
 */
const uriToFile = async (uri: string, filename: string = 'image.jpg'): Promise<File> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

/**
 * Comprime imagen usando expo-image-manipulator (para mobile)
 */
const compressImageMobile = async (
  file: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<Blob> => {
  const {
    maxWidthOrHeight = 1200,
    quality = 0.8,
  } = options;

  try {
    // Convertir File/Blob a URI temporal
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file instanceof Blob ? file : file);
    });

    console.log('📱 Comprimiendo imagen en móvil...', {
      originalSize: `${(file.size / 1024).toFixed(1)} KB`,
      maxWidth: maxWidthOrHeight,
      quality,
    });

    // Manipular imagen con expo-image-manipulator
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      dataUrl,
      [{ resize: { width: maxWidthOrHeight } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Convertir resultado a Blob
    const response = await fetch(manipulatedImage.uri);
    const compressedBlob = await response.blob();

    const reduction = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);
    console.log('✅ Imagen comprimida en móvil:', {
      original: `${(file.size / 1024).toFixed(1)} KB`,
      compressed: `${(compressedBlob.size / 1024).toFixed(1)} KB`,
      reduction: `${reduction}%`,
    });

    return compressedBlob;
  } catch (error) {
    console.error('❌ Error comprimiendo imagen en móvil:', error);
    // Si falla, devolver blob original
    return file instanceof Blob ? file : file;
  }
};

/**
 * Optimiza una imagen usando browser-image-compression (web) o expo-image-manipulator (mobile)
 */
export const compressImage = async (
  file: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<Blob> => {
  const {
    maxSizeMB = 0.5, // 500KB máximo
    maxWidthOrHeight = 1200,
    quality = 0.8,
    useWebWorker = false, // Deshabilitado para mejor compatibilidad
  } = options;

  // En mobile (iOS/Android), usar expo-image-manipulator
  if (Platform.OS !== 'web') {
    return compressImageMobile(file, { maxWidthOrHeight, quality });
  }

  // En web, comprimir con browser-image-compression
  try {
    console.log('🖼️ Comprimiendo imagen en web...', {
      originalSize: `${((file.size) / 1024).toFixed(1)} KB`,
      maxSizeMB,
      maxWidthOrHeight,
    });

    const compressedBlob = await imageCompression(file as File, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType: 'image/jpeg',
      initialQuality: quality,
    });

    const reduction = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);
    console.log('✅ Imagen comprimida en web:', {
      original: `${(file.size / 1024).toFixed(1)} KB`,
      compressed: `${(compressedBlob.size / 1024).toFixed(1)} KB`,
      reduction: `${reduction}%`,
    });

    return compressedBlob;
  } catch (error) {
    console.error('❌ Error comprimiendo imagen en web:', error);
    // Si falla, devolver blob original
    return file instanceof Blob ? file : file;
  }
};

/**
 * Comprime imagen para posts (max 1200px, 500KB)
 */
export const compressPostImage = async (file: File | Blob): Promise<Blob> => {
  return compressImage(file, {
    maxSizeMB: 0.5, // 500KB
    maxWidthOrHeight: 1200,
    quality: 0.8,
  });
};

/**
 * Crea thumbnail para fotos de perfil (max 150px, 50KB)
 */
export const compressThumbnail = async (file: File | Blob): Promise<Blob> => {
  return compressImage(file, {
    maxSizeMB: 0.05, // 50KB
    maxWidthOrHeight: 150,
    quality: 0.7,
  });
};

/**
 * Crea thumbnail para posts (max 400px, 100KB) - para feed rápido
 */
export const compressPostThumbnail = async (file: File | Blob): Promise<Blob> => {
  return compressImage(file, {
    maxSizeMB: 0.1, // 100KB
    maxWidthOrHeight: 400,
    quality: 0.75,
  });
};

/**
 * Comprime imagen de perfil (max 800px, 300KB)
 */
export const compressProfileImage = async (file: File | Blob): Promise<Blob> => {
  return compressImage(file, {
    maxSizeMB: 0.3, // 300KB
    maxWidthOrHeight: 800,
    quality: 0.85,
  });
};

/**
 * Convierte blob a data URL (para preview)
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
