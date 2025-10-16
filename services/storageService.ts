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

// Función específica para subir imágenes de perfil desde URI
export const uploadProfileImageFromUri = async (
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  try {
    // Convertir URI a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return await storageService.uploadImage(blob, userId, 'profile', onProgress);
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

export const uploadPostImage = (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
) => storageService.uploadImage(imageFile, userId, 'posts', onProgress);

export const uploadPostVideo = (
  videoFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
) => storageService.uploadVideo(videoFile, userId, 'posts', onProgress);
