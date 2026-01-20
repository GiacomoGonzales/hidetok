import React, { useState, useRef } from 'react';
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

// Componente individual para cada imagen con zoom y gestos
const ZoomableImage: React.FC<{
  imageUrl: string;
  onSwipeDown: () => void;
  isActive: boolean;
}> = ({ imageUrl, onSwipeDown, isActive }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  const [isZoomed, setIsZoomed] = useState(false);
  const lastTap = useRef(0);

  // PanResponder para manejar gestos
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isZoomed) {
          // Si está zoomeado, permitir pan
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        } else {
          // Si no está zoomeado, permitir swipe vertical to dismiss (arriba o abajo)
          translateY.setValue(gestureState.dy);
          // Reducir opacidad del fondo según el swipe (en cualquier dirección)
          const opacity = Math.max(0, 1 - Math.abs(gestureState.dy) / 300);
          backgroundOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = Math.abs(gestureState.vy); // Velocidad vertical absoluta
        const distance = Math.abs(gestureState.dy); // Distancia vertical absoluta

        // Si deslizó verticalmente más de 120px o con velocidad alta, cerrar
        if (!isZoomed && (distance > 120 || (distance > 50 && velocity > 0.5))) {
          // Determinar dirección (arriba o abajo)
          const direction = gestureState.dy > 0 ? screenHeight : -screenHeight;

          // Animar suavemente hacia la dirección del swipe y desvanecer
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: direction,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onSwipeDown();
          });
          return;
        }

        // Si está zoomeado, aplicar límites
        if (isZoomed) {
          const maxTranslate = screenWidth * 0.5;
          const targetX = Math.max(-maxTranslate, Math.min(maxTranslate, gestureState.dx));
          const targetY = Math.max(-maxTranslate, Math.min(maxTranslate, gestureState.dy));

          Animated.parallel([
            Animated.spring(translateX, {
              toValue: targetX,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }),
            Animated.spring(translateY, {
              toValue: targetY,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }),
          ]).start();
        } else {
          // Volver a la posición original con animación suave
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 9,
              tension: 50,
            }),
            Animated.spring(backgroundOpacity, {
              toValue: 1,
              useNativeDriver: true,
              friction: 9,
              tension: 50,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Doble tap para zoom
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Doble tap detectado
      if (isZoomed) {
        // Zoom out
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
          }),
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }),
        ]).start();
        setIsZoomed(false);
      } else {
        // Zoom in
        Animated.spring(scale, {
          toValue: 2.5,
          useNativeDriver: true,
          friction: 7,
        }).start();
        setIsZoomed(true);
      }
    }

    lastTap.current = now;
  };

  // Reset cuando cambia la imagen activa
  React.useEffect(() => {
    if (!isActive) {
      setIsZoomed(false);
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      backgroundOpacity.setValue(1);
    }
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.imageContainer,
        {
          opacity: backgroundOpacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleDoubleTap}
        style={{ width: '100%', height: '100%' }}
      >
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            transform: [
              { scale },
              { translateX },
              { translateY },
            ],
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={300}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls,
  initialIndex = 0,
  onClose
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Scroll al índice inicial cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      scrollX.setValue(initialIndex * screenWidth);
    }
  }, [visible, initialIndex]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / screenWidth);
        setCurrentIndex(index);
      },
    }
  );

  // Si hay una sola imagen, mostrar directamente sin carousel
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
      <View style={styles.container}>
        {/* Background */}
        <View style={styles.background}>
          <View style={styles.backgroundOverlay} />
        </View>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + SPACING.md }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={ICON_SIZE.xl} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Image counter - solo mostrar si hay múltiples imágenes */}
        {!isSingleImage && (
          <View style={[styles.imageCounter, { top: insets.top + SPACING.md }]}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1}/{imageUrls.length}
            </Text>
          </View>
        )}

        {/* Imagen única o carousel */}
        {isSingleImage ? (
          // Una sola imagen - sin scroll horizontal
          <ZoomableImage
            imageUrl={imageUrls[0]}
            onSwipeDown={onClose}
            isActive={true}
          />
        ) : (
          // Múltiples imágenes - con carousel
          <Animated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentOffset={{ x: initialIndex * screenWidth, y: 0 }}
          >
            {imageUrls.map((imageUrl, index) => (
              <ZoomableImage
                key={index}
                imageUrl={imageUrl}
                onSwipeDown={onClose}
                isActive={index === currentIndex}
              />
            ))}
          </Animated.ScrollView>
        )}

        {/* Page indicators - solo mostrar si hay múltiples imágenes */}
        {!isSingleImage && (
          <View style={[styles.pageIndicatorContainer, { bottom: insets.bottom + SPACING.xl }]}>
            {imageUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  {
                    backgroundColor: index === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                    opacity: index === currentIndex ? 1 : 0.6,
                  }
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  scrollView: {
    flex: 1,
  },
  imageContainer: {
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
