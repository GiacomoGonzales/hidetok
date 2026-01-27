import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// Prefijos de URL que la app reconoce
const prefix = Linking.createURL('/');
const universalLinks = ['https://hidetok.com', 'https://www.hidetok.com'];

export const linking: LinkingOptions<any> = {
  prefixes: [prefix, ...universalLinks],
  config: {
    screens: {
      Main: {
        screens: {
          Home: {
            screens: {
              Landing: 'home',
              Feed: 'feed/:communitySlug?',
            },
          },
          Profile: {
            screens: {
              ProfileMain: 'profile',
            },
          },
        },
      },
      PostDetail: {
        path: 'post/:postId',
        parse: {
          postId: (postId: string) => postId,
        },
      },
      UserProfile: {
        path: 'user/:userId',
        parse: {
          userId: (userId: string) => userId,
        },
      },
      Community: {
        path: 'community/:communityId',
        parse: {
          communityId: (communityId: string) => communityId,
        },
      },
    },
  },
};

// Helper para generar URLs compartibles
export const generatePostUrl = (postId: string): string => {
  return `https://hidetok.com/post/${postId}`;
};

export const generateUserUrl = (userId: string): string => {
  return `https://hidetok.com/user/${userId}`;
};

export const generateCommunityUrl = (communityId: string): string => {
  return `https://hidetok.com/community/${communityId}`;
};

// URL corta para mostrar en la imagen compartida
export const getShortUrl = (postId: string): string => {
  // Usar solo los primeros 8 caracteres del ID para hacerlo más corto
  const shortId = postId.slice(0, 8);
  return `hidetok.com/p/${shortId}`;
};
