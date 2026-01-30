import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Text,
  Animated,
  PanResponder,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, ICON_SIZE, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

interface ImageViewerProps {
  visible: boolean;
  imageUrls: string[];
  initialIndex?: number;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const getDistance = (touches: any[]): number => {
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getMidpoint = (touches: any[]) => ({
  x: (touches[0].pageX + touches[1].pageX) / 2,
  y: (touches[0].pageY + touches[1].pageY) / 2,
});

// Componente individual de imagen con zoom y swipe-to-close
const ZoomableImage: React.FC<{
  uri: string;
  parentTranslateY: Animated.Value;
  parentBackgroundOpacity: Animated.Value;
  onSwipeClose: (direction: number) => void;
  onZoomChange?: (isZoomed: boolean) => void;
}> = ({ uri, parentTranslateY, parentBackgroundOpacity, onSwipeClose, onZoomChange }) => {
  // Animated values para zoom y pan de la imagen
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Valores JS para tracking
  const scaleValue = useRef(1);
  const translateXValue = useRef(0);
  const translateYValue = useRef(0);
  const initialPinchDistance = useRef(0);
  const initialScale = useRef(1);
  const isPinching = useRef(false);
  const wasPinching = useRef(false);
  const lastTapTime = useRef(0);
  const gestureStartTime = useRef(0);
  const gestureStartPos = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    scaleValue.current = 1;
    translateXValue.current = 0;
    translateYValue.current = 0;
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.spring(translateXAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
      Animated.spring(translateYAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
    ]).start();
    onZoomChange?.(false);
  }, [scaleAnim, translateXAnim, translateYAnim, onZoomChange]);

  const zoomTo = useCallback((targetScale: number) => {
    scaleValue.current = targetScale;
    if (targetScale <= 1) {
      translateXValue.current = 0;
      translateYValue.current = 0;
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.spring(translateXAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
        Animated.spring(translateYAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
      ]).start();
      onZoomChange?.(false);
    } else {
      Animated.spring(scaleAnim, { toValue: targetScale, useNativeDriver: true, friction: 5 }).start();
      onZoomChange?.(true);
    }
  }, [scaleAnim, translateXAnim, translateYAnim, onZoomChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        gestureStartTime.current = Date.now();
        gestureStartPos.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };

        if (touches && touches.length >= 2) {
          isPinching.current = true;
          wasPinching.current = true;
          initialPinchDistance.current = getDistance(touches);
          initialScale.current = scaleValue.current;
        } else {
          isPinching.current = false;
          wasPinching.current = false;
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState) => {
        const touches = evt.nativeEvent.touches;

        // Pinch zoom (2 dedos)
        if (touches && touches.length >= 2) {
          if (!isPinching.current) {
            // Transición de 1 dedo a 2 dedos
            isPinching.current = true;
            wasPinching.current = true;
            initialPinchDistance.current = getDistance(touches);
            initialScale.current = scaleValue.current;
            return;
          }

          const dist = getDistance(touches);
          const ratio = dist / initialPinchDistance.current;
          const newScale = Math.max(0.5, Math.min(5, initialScale.current * ratio));
          scaleValue.current = newScale;
          scaleAnim.setValue(newScale);
          return;
        }

        // Si estábamos haciendo pinch y levantamos un dedo, ignorar
        if (wasPinching.current) {
          return;
        }

        // 1 dedo
        if (scaleValue.current > 1.05) {
          // Pan cuando hay zoom
          translateXAnim.setValue(translateXValue.current + gestureState.dx);
          translateYAnim.setValue(translateYValue.current + gestureState.dy);
        } else {
          // Swipe to close cuando no hay zoom
          parentTranslateY.setValue(gestureState.dy);
          const opacity = Math.max(0, 1 - Math.abs(gestureState.dy) / 300);
          parentBackgroundOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState) => {
        // Finalizar pinch
        if (isPinching.current || wasPinching.current) {
          isPinching.current = false;
          wasPinching.current = false;

          if (scaleValue.current < 1) {
            resetZoom();
          } else if (scaleValue.current > 4) {
            scaleValue.current = 4;
            Animated.spring(scaleAnim, { toValue: 4, useNativeDriver: true, friction: 5 }).start();
            onZoomChange?.(true);
          } else {
            onZoomChange?.(scaleValue.current > 1.05);
          }
          return;
        }

        // Detectar tap (poco movimiento, poco tiempo)
        const elapsed = Date.now() - gestureStartTime.current;
        const moved = Math.abs(gestureState.dx) + Math.abs(gestureState.dy);

        if (elapsed < 250 && moved < 10) {
          // Es un tap - verificar double tap
          const now = Date.now();
          if (now - lastTapTime.current < 300) {
            // Double tap
            lastTapTime.current = 0;
            if (scaleValue.current > 1.05) {
              resetZoom();
            } else {
              zoomTo(2.5);
            }
          } else {
            lastTapTime.current = now;
          }
          return;
        }

        // Finalizar pan cuando hay zoom
        if (scaleValue.current > 1.05) {
          translateXValue.current += gestureState.dx;
          translateYValue.current += gestureState.dy;

          // Limitar pan para no salir demasiado de la imagen
          const maxTranslateX = (screenWidth * (scaleValue.current - 1)) / 2;
          const maxTranslateY = (screenHeight * (scaleValue.current - 1)) / 2;

          let finalX = translateXValue.current;
          let finalY = translateYValue.current;
          let needsSnap = false;

          if (Math.abs(finalX) > maxTranslateX) {
            finalX = finalX > 0 ? maxTranslateX : -maxTranslateX;
            needsSnap = true;
          }
          if (Math.abs(finalY) > maxTranslateY) {
            finalY = finalY > 0 ? maxTranslateY : -maxTranslateY;
            needsSnap = true;
          }

          if (needsSnap) {
            translateXValue.current = finalX;
            translateYValue.current = finalY;
            Animated.spring(translateXAnim, { toValue: finalX, useNativeDriver: true, friction: 6 }).start();
            Animated.spring(translateYAnim, { toValue: finalY, useNativeDriver: true, friction: 6 }).start();
          }
          return;
        }

        // Finalizar swipe to close
        const velocity = Math.abs(gestureState.vy);
        const distance = Math.abs(gestureState.dy);

        if (distance > 100 || (distance > 40 && velocity > 0.5)) {
          const direction = gestureState.dy > 0 ? screenHeight : -screenHeight;
          onSwipeClose(direction);
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(parentTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 50,
            }),
            Animated.spring(parentBackgroundOpacity, {
              toValue: 1,
              useNativeDriver: true,
              friction: 8,
              tension: 50,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        isPinching.current = false;
        wasPinching.current = false;

        // Snap back si se cancela el gesto
        if (scaleValue.current <= 1.05) {
          Animated.parallel([
            Animated.spring(parentTranslateY, { toValue: 0, useNativeDriver: true }),
            Animated.spring(parentBackgroundOpacity, { toValue: 1, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.imageWrapper} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.zoomContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateX: translateXAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
};

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls,
  initialIndex = 0,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Animación para el swipe vertical (cerrar)
  const translateY = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  // Reset cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      translateY.setValue(0);
      backgroundOpacity.setValue(1);

      // Scroll a la imagen inicial
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialIndex * screenWidth, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  const handleSwipeClose = useCallback((direction: number) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: direction,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, translateY, backgroundOpacity]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== currentIndex && index >= 0 && index < imageUrls.length) {
      setCurrentIndex(index);
    }
  };

  const isSingleImage = imageUrls.length === 1;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        backgroundColor="rgba(0, 0, 0, 0.95)"
        barStyle="light-content"
      />

      {/* Background con opacidad animada */}
      <Animated.View
        style={[styles.background, { opacity: backgroundOpacity }]}
      />

      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + SPACING.md }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={ICON_SIZE.xl} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Image counter */}
        {!isSingleImage && (
          <View style={[styles.imageCounter, { top: insets.top + SPACING.md }]}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1}/{imageUrls.length}
            </Text>
          </View>
        )}

        {/* Contenido animado (se mueve con el swipe vertical) */}
        <Animated.View
          style={[
            styles.contentContainer,
            { transform: [{ translateY }] },
          ]}
        >
          {isSingleImage ? (
            <ZoomableImage
              uri={imageUrls[0]}
              parentTranslateY={translateY}
              parentBackgroundOpacity={backgroundOpacity}
              onSwipeClose={handleSwipeClose}
              onZoomChange={handleZoomChange}
            />
          ) : (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.carouselScrollView}
              bounces={false}
              scrollEnabled={!isZoomed}
            >
              {imageUrls.map((imageUrl, index) => (
                <View key={index} style={styles.carouselPage}>
                  <ZoomableImage
                    uri={imageUrl}
                    parentTranslateY={translateY}
                    parentBackgroundOpacity={backgroundOpacity}
                    onSwipeClose={handleSwipeClose}
                    onZoomChange={handleZoomChange}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Page indicators */}
        {!isSingleImage && (
          <View style={[styles.pageIndicatorContainer, { bottom: insets.bottom + SPACING.xl }]}>
            {imageUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  {
                    backgroundColor:
                      index === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  carouselScrollView: {
    flex: 1,
    width: screenWidth,
  },
  carouselPage: {
    width: screenWidth,
    height: screenHeight,
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  zoomContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pageIndicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ImageViewer;
