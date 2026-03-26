import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ConfettiExplosionProps } from '../models/confetti-explosion-props.interface';

const PARTICLE_COUNT = 8;
const DURATION = 800;
const COLORS = [
  '#FFD700',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FF8C94',
  '#A8E6CF',
  '#FFB347',
];

interface ParticleConfig {
  angle: number;
  distance: number;
  color: string;
  delay: number;
}

function generateParticles(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    angle: (index / PARTICLE_COUNT) * 2 * Math.PI,
    distance: 60 + Math.random() * 40,
    color: COLORS[index % COLORS.length],
    delay: index * 30,
  }));
}

function Particle({
  config,
  origin,
}: {
  config: ParticleConfig;
  origin: { x: number; y: number };
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      config.delay + DURATION * 0.5,
      withTiming(0, { duration: DURATION * 0.5 }),
    );
  }, [config.delay, progress, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = Math.cos(config.angle) * config.distance * progress.value;
    const translateY =
      Math.sin(config.angle) * config.distance * progress.value - 20 * progress.value;
    const scale = 1 - progress.value * 0.5;

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: origin.x - 4, top: origin.y - 4, backgroundColor: config.color },
        animatedStyle,
      ]}
    />
  );
}

export const ConfettiExplosion = memo(function ConfettiExplosion({
  origin,
  onComplete,
}: ConfettiExplosionProps) {
  const particles = generateParticles();

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, DURATION + 200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((config, index) => (
        <Particle key={index} config={config} origin={origin} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
