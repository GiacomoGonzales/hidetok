import { Image as RNImage } from 'react-native';

const cache = new Map<string, number>();

export function getCachedAspectRatio(url: string): number | undefined {
  return cache.get(url);
}

export function setCachedAspectRatio(url: string, aspectRatio: number): void {
  cache.set(url, aspectRatio);
}

export function fetchAndCacheAspectRatio(
  url: string,
  onResult: (aspectRatio: number) => void
): void {
  const cached = cache.get(url);
  if (cached !== undefined) {
    onResult(cached);
    return;
  }

  RNImage.getSize(
    url,
    (width, height) => {
      const aspectRatio = width / height;
      cache.set(url, aspectRatio);
      onResult(aspectRatio);
    },
    () => {
      // On failure, cache the default 4:3 to avoid repeated failed requests
      cache.set(url, 4 / 3);
      onResult(4 / 3);
    }
  );
}
