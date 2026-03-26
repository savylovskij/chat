import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';

const PARTICLE_COUNT = 20;
const EMERALD = 'rgba(45, 212, 140, 0.12)';

interface ParticleData {
  translateX: Animated.Value;
  translateY: Animated.Value;
  startX: number;
  startY: number;
  radius: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export const ParticleBackground = memo(function ParticleBackground() {
  const { width, height } = useWindowDimensions();
  const particles = useRef<ParticleData[]>([]);

  if (particles.current.length === 0) {
    particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      startX: Math.random() * width,
      startY: Math.random() * height,
      radius: randomBetween(2, 5),
    }));
  }

  useEffect(() => {
    const animations = particles.current.map((particle) => {
      const driftX = Animated.loop(
        Animated.sequence([
          Animated.timing(particle.translateX, {
            toValue: randomBetween(-30, 30),
            duration: randomBetween(6000, 12000),
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: randomBetween(-30, 30),
            duration: randomBetween(6000, 12000),
            useNativeDriver: true,
          }),
        ]),
      );

      const driftY = Animated.loop(
        Animated.sequence([
          Animated.timing(particle.translateY, {
            toValue: randomBetween(-40, -80),
            duration: randomBetween(8000, 16000),
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: 0,
            duration: randomBetween(8000, 16000),
            useNativeDriver: true,
          }),
        ]),
      );

      driftX.start();
      driftY.start();

      return { driftX, driftY };
    });

    return () => {
      for (const animation of animations) {
        animation.driftX.stop();
        animation.driftY.stop();
      }
    };
  }, []);

  return (
    <>
      {particles.current.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: particle.startX,
              top: particle.startY,
              width: particle.radius * 2,
              height: particle.radius * 2,
              borderRadius: particle.radius,
              transform: [{ translateX: particle.translateX }, { translateY: particle.translateY }],
            },
          ]}
        />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: EMERALD,
  },
});
