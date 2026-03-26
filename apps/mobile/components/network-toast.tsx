import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text } from 'react-native';

import { NetworkToastProps } from '../models/network-toast-props.interface';

export const NetworkToast = memo(function NetworkToast({ isConnected }: NetworkToastProps) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-60)).current;
  const wasDisconnected = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      wasDisconnected.current = true;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else if (wasDisconnected.current) {
      const timeout = setTimeout(() => {
        Animated.spring(translateY, {
          toValue: -60,
          useNativeDriver: true,
        }).start(() => {
          wasDisconnected.current = false;
        });
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isConnected, translateY]);

  const backgroundColor = isConnected ? '#34C759' : '#FF3B30';
  const label = isConnected ? t('network.connected') : t('network.disconnected');

  return (
    <Animated.View
      style={[styles.container, { backgroundColor, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
