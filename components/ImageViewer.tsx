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
  ScrollView,
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

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls,
  initialIndex = 0,
  onClose
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animación para el swipe vertical (cerrar)
  const translateY = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  // Tracking del swipe
  const isHorizontalSwipe = useRef(false);
  const gestureStarted = useRef(false);

  // Reset cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateY.setValue(0);
      backgroundOpacity.setValue(1);
      isHorizontalSwipe.current = false;
      gestureStarted.current = false;

      // Scroll a la imagen inicial
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialIndex * screenWidth, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  // PanResponder para cerrar con swipe vertical
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Solo capturar si es claramente un gesto vertical
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        const hasMovedEnough = Math.abs(gestureState.dy) > 10;

        // Si ya determinamos que es horizontal, no capturar
        if (isHorizontalSwipe.current) {
          return false;
        }

        // Determinar dirección inicial del gesto
        if (!gestureStarted.current && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5)) {
          gestureStarted.current = true;
          isHorizontalSwipe.current = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        }

        return isVertical && hasMovedEnough && !isHorizontalSwipe.current;
      },
      onPanResponderGrant: () => {
        // Gesto iniciado
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(gestureState.dy);
        const opacity = Math.max(0, 1 - Math.abs(gestureState.dy) / 300);
        backgroundOpacity.setValue(opacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        gestureStarted.current = false;
        isHorizontalSwipe.current = false;

        const velocity = Math.abs(gestureState.vy);
        const distance = Math.abs(gestureState.dy);

        // Si deslizó lo suficiente, cerrar
        if (distance > 100 || (distance > 40 && velocity > 0.5)) {
          const direction = gestureState.dy > 0 ? screenHeight : -screenHeight;

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
            // Reset para la próxima vez
            translateY.setValue(0);
            backgroundOpacity.setValue(1);
          });
        } else {
          // Volver a posición original
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 50,
            }),
            Animated.spring(backgroundOpacity, {
              toValue: 1,
              useNativeDriver: true,
              friction: 8,
              tension: 50,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        gestureStarted.current = false;
        isHorizontalSwipe.current = false;
        // Volver a posición original si se cancela
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(backgroundOpacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== currentIndex && index >= 0 && index < imageUrls.length) {
      setCurrentIndex(index);
    }
  };

  const handleScrollBegin = () => {
    // Marcar como swipe horizontal cuando el ScrollView inicia
    isHorizontalSwipe.current = true;
    gestureStarted.current = true;
  };

  const handleScrollEnd = () => {
    // Reset después de terminar el scroll horizontal
    setTimeout(() => {
      isHorizontalSwipe.current = false;
      gestureStarted.current = false;
    }, 100);
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
        style={[
          styles.background,
          { opacity: backgroundOpacity }
        ]}
      />

      {/* Contenedor principal con pan responder */}
      <View style={styles.container} {...panResponder.panHandlers}>

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
            { transform: [{ translateY }] }
          ]}
        >
          {isSingleImage ? (
            // Una sola imagen
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUrls[0] }}
                style={styles.image}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            </View>
          ) : (
            // Múltiples imágenes - carousel simple
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBegin}
              onScrollEndDrag={handleScrollEnd}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEventThrottle={16}
              style={styles.scrollView}
              bounces={false}
            >
              {imageUrls.map((imageUrl, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
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
                    backgroundColor: index === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
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
  scrollView: {
    flex: 1,
    width: screenWidth,
  },
  imageWrapper: {
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
