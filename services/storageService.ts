import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { compressPostImage, compressThumbnail, compressProfileImage, compressPostThumbnail } from '../utils/imageUtils';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface FileMetadata {
  name: string;
  fullPath: string;
  bucket: string;
  generation: string;
  metageneration: string;
  timeCreated: string;
  updated: string;
  size: number;
  md5Hash?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType?: string;
  customMetadata?: { [key: string]: string };
}

class StorageService {
  // Subir archivo con progreso
  async uploadFile(
    file: Blob | Uint8Array | ArrayBuffer,
    path: string,
    onProgress?: (progress: UploadProgress) => void,
    metadata?: any
  ): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      
      if (onProgress) {
        // Upload con seguimiento de progreso
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              };
              onProgress(progress);
            },
            (error) => {
              console.error('Error durante la subida:', error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } else {
        // Upload simple sin progreso
        const snapshot = await uploadBytes(storageRef, file, metadata);
        return await getDownloadURL(snapshot.ref);
      }
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      throw error;
    }
  }

  // Subir imagen
  async uploadImage(
    imageFile: Blob | Uint8Array | ArrayBuffer,
    userId: string,
    folder: 'profile' | 'posts' | 'stories' = 'posts',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}.jpg`;
    const path = `images/${folder}/${userId}/${fileName}`;

    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadDate: new Date().toISOString(),
        folder: folder
      }
    };

    return this.uploadFile(imageFile, path, onProgress, metadata);
  }

  // Subir video
  async uploadVideo(
    videoFile: Blob | Uint8Array | ArrayBuffer,
    userId: string,
    folder: 'posts' | 'stories' = 'posts',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}.mp4`;
    const path = `videos/${folder}/${userId}/${fileName}`;

    const metadata = {
      contentType: 'video/mp4',
      customMetadata: {
        uploadedBy: userId,
        uploadDate: new Date().toISOString(),
        folder: folder
      }
    };

    return this.uploadFile(videoFile, path, onProgress, metadata);
  }

  // Obtener URL de descarga
  async getDownloadUrl(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error obteniendo URL de descarga:', error);
      throw error;
    }
  }

  // Eliminar archivo
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      throw error;
    }
  }

  // Eliminar archivo por URL
  async deleteFileByUrl(url: string): Promise<void> {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error eliminando archivo por URL:', error);
      throw error;
    }
  }

  // Listar archivos en una carpeta
  async listFiles(folderPath: string): Promise<string[]> {
    try {
      const storageRef = ref(storage, folderPath);
      const result = await listAll(storageRef);
      
      const downloadUrls = await Promise.all(
        result.items.map(async (itemRef) => {
          return await getDownloadURL(itemRef);
        })
      );

      return downloadUrls;
    } catch (error) {
      console.error('Error listando archivos:', error);
      throw error;
    }
  }

  // Obtener metadatos de archivo
  async getFileMetadata(path: string): Promise<FileMetadata> {
    try {
      const storageRef = ref(storage, path);
      const metadata = await getMetadata(storageRef);
      return metadata as FileMetadata;
    } catch (error) {
      console.error('Error obteniendo metadatos:', error);
      throw error;
    }
  }

  // Actualizar metadatos de archivo
  async updateFileMetadata(
    path: string,
    newMetadata: { [key: string]: string }
  ): Promise<FileMetadata> {
    try {
      const storageRef = ref(storage, path);
      const metadata = await updateMetadata(storageRef, {
        customMetadata: newMetadata
      });
      return metadata as FileMetadata;
    } catch (error) {
      console.error('Error actualizando metadatos:', error);
      throw error;
    }
  }

  // Generar nombre de archivo único
  generateFileName(userId: string, extension: string = 'jpg'): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${userId}_${timestamp}_${randomString}.${extension}`;
  }

  // Obtener ruta para imagen de perfil
  getProfileImagePath(userId: string): string {
    const fileName = this.generateFileName(userId);
    return `images/profile/${userId}/${fileName}`;
  }

  // Obtener ruta para imagen de post
  getPostImagePath(userId: string): string {
    const fileName = this.generateFileName(userId);
    return `images/posts/${userId}/${fileName}`;
  }

  // Obtener ruta para video de post
  getPostVideoPath(userId: string): string {
    const fileName = this.generateFileName(userId, 'mp4');
    return `videos/posts/${userId}/${fileName}`;
  }
}

// Crear instancia del servicio
export const storageService = new StorageService();

// Helper para convertir URI a blob (funciona en web y mobile)
const uriToBlob = async (uri: string): Promise<Blob> => {
  console.log('🔄 Convirtiendo URI a blob:', uri.substring(0, 50) + '...');

  try {
    // Intentar con fetch primero (funciona en la mayoría de los casos)
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    const blob = await response.blob();
    console.log('✅ Blob obtenido via fetch, tamaño:', (blob.size / 1024).toFixed(1), 'KB');
    return blob;
  } catch (fetchError) {
    console.warn('⚠️ Fetch falló, intentando método alternativo:', fetchError);

    // Método alternativo usando XMLHttpRequest (más compatible con URIs locales en mobile)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 0) { // status 0 es válido para file://
          console.log('✅ Blob obtenido via XHR, tamaño:', (xhr.response.size / 1024).toFixed(1), 'KB');
          resolve(xhr.response);
        } else {
          reject(new Error(`XHR failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = function() {
        console.error('❌ XHR error');
        reject(new Error('XHR request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }
};

// Función específica para subir imágenes de perfil desde URI con optimización
export const uploadProfileImageFromUri = async (
  imageUri: string,
  userId: string,
  type: 'avatar' | 'cover' = 'avatar',
  onProgress?: (progress: UploadProgress) => void
): Promise<{ fullSize: string; thumbnail: string }> => {
  try {
    console.log(`🖼️ Subiendo imagen de ${type === 'cover' ? 'portada' : 'perfil'}...`);
    console.log(`📍 URI recibido: ${imageUri.substring(0, 100)}...`);

    // Convertir URI a blob usando helper robusto
    const blob = await uriToBlob(imageUri);

    if (!blob || blob.size === 0) {
      throw new Error('Blob vacío o inválido');
    }

    console.log(`📊 Tamaño original: ${(blob.size / 1024).toFixed(1)} KB`);

    if (type === 'cover') {
      // Para cover, solo comprimir y subir una versión
      const compressedBlob = await compressPostImage(blob);
      console.log(`✅ Comprimida: ${(compressedBlob.size / 1024).toFixed(1)} KB`);

      const timestamp = Date.now();
      const coverPath = `images/profile/${userId}/cover_${timestamp}.jpg`;

      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: userId,
          uploadDate: new Date().toISOString(),
          type: 'cover'
        }
      };

      const coverUrl = await storageService.uploadFile(compressedBlob, coverPath, onProgress, metadata);
      console.log('✅ Imagen de portada subida:', coverUrl);

      return {
        fullSize: coverUrl,
        thumbnail: coverUrl, // Retornar la misma URL para mantener la interfaz
      };
    } else {
      // Para avatar, comprimir para full size y thumbnail
      const [fullSizeBlob, thumbnailBlob] = await Promise.all([
        compressProfileImage(blob),
        compressThumbnail(blob)
      ]);

      console.log(`✅ Full size: ${(fullSizeBlob.size / 1024).toFixed(1)} KB`);
      console.log(`✅ Thumbnail: ${(thumbnailBlob.size / 1024).toFixed(1)} KB`);

      // Subir ambas imágenes con timestamp
      const timestamp = Date.now();
      const fullSizePath = `images/profile/${userId}/${timestamp}.jpg`;
      const thumbnailPath = `images/profile/${userId}/${timestamp}_thumb.jpg`;

      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: userId,
          uploadDate: new Date().toISOString(),
          type: 'avatar'
        }
      };

      // Subir ambas imágenes en paralelo
      const [fullSizeUrl, thumbnailUrl] = await Promise.all([
        storageService.uploadFile(fullSizeBlob, fullSizePath, onProgress, metadata),
        storageService.uploadFile(thumbnailBlob, thumbnailPath, undefined, metadata)
      ]);

      console.log('✅ Imagen de perfil subida:', fullSizeUrl);
      console.log('✅ Thumbnail subido:', thumbnailUrl);

      return {
        fullSize: fullSizeUrl,
        thumbnail: thumbnailUrl,
      };
    }
  } catch (error) {
    console.error('Error uploading profile image from URI:', error);
    throw error;
  }
};

// Funciones de conveniencia específicas para la app
export const uploadProfileImage = (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
) => storageService.uploadImage(imageFile, userId, 'profile', onProgress);

// Función optimizada para subir imágenes de posts (con thumbnail para carga rápida)
export const uploadPostImage = async (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ fullSize: string; thumbnail: string }> => {
  try {
    console.log('📤 Subiendo imagen de post...');

    // Convertir a Blob si es necesario
    let blob: Blob;
    if (imageFile instanceof Blob) {
      blob = imageFile;
    } else {
      blob = new Blob([imageFile], { type: 'image/jpeg' });
    }

    const originalSize = blob.size;
    console.log(`📊 Tamaño original: ${(originalSize / 1024).toFixed(1)} KB`);

    // Comprimir imágenes en paralelo: full size y thumbnail
    const [fullSizeBlob, thumbnailBlob] = await Promise.all([
      compressPostImage(blob),
      compressPostThumbnail(blob)
    ]);

    console.log(`✅ Full size: ${(fullSizeBlob.size / 1024).toFixed(1)} KB`);
    console.log(`✅ Thumbnail: ${(thumbnailBlob.size / 1024).toFixed(1)} KB`);

    // Generar paths únicos con timestamp
    const timestamp = Date.now();
    const fileName = `${timestamp}`;
    const fullSizePath = `images/posts/${userId}/${fileName}.jpg`;
    const thumbnailPath = `images/posts/${userId}/${fileName}_thumb.jpg`;

    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadDate: new Date().toISOString(),
        folder: 'posts'
      }
    };

    // Subir ambas imágenes en paralelo para máxima velocidad
    const [fullSizeUrl, thumbnailUrl] = await Promise.all([
      storageService.uploadFile(fullSizeBlob, fullSizePath, onProgress, metadata),
      storageService.uploadFile(thumbnailBlob, thumbnailPath, undefined, metadata)
    ]);

    console.log('✅ Imagen de post subida:', fullSizeUrl);
    console.log('✅ Thumbnail subido:', thumbnailUrl);

    return {
      fullSize: fullSizeUrl,
      thumbnail: thumbnailUrl,
    };
  } catch (error) {
    console.error('Error uploading post image:', error);
    throw error;
  }
};

export const uploadPostVideo = (
  videoFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
) => storageService.uploadVideo(videoFile, userId, 'posts', onProgress);

// Función para subir imágenes de mensajes desde URI
export const uploadMessageImageFromUri = async (
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  try {
    console.log('📤 Subiendo imagen de mensaje...');

    // Convertir URI a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    console.log(`📊 Tamaño original: ${(blob.size / 1024).toFixed(1)} KB`);

    // Comprimir imagen antes de subir (usar compresión de posts)
    const compressedBlob = await compressPostImage(blob);
    console.log(`✅ Comprimida: ${(compressedBlob.size / 1024).toFixed(1)} KB`);

    const timestamp = Date.now();
    const fileName = `${timestamp}.jpg`;
    const path = `images/messages/${userId}/${fileName}`;

    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadDate: new Date().toISOString(),
        folder: 'messages'
      }
    };

    return await storageService.uploadFile(compressedBlob, path, onProgress, metadata);
  } catch (error) {
    console.error('Error uploading message image from URI:', error);
    throw error;
  }
};
