import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function WeeklyBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1); // avoid divide-by-zero

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: 16, marginBottom: 6 }}>Completed This Week</Text>

      <Svg width={320} height={160}>
        {data.map((value, i) => {
          const height = useSharedValue(0);

          useEffect(() => {
            height.value = withTiming((value / max) * 120, { duration: 600 });
          }, [value]);

          const animatedProps = useAnimatedProps(() => ({
            height: height.value,
            y: 140 - height.value,
          }));

          return (
            <AnimatedRect
              key={i}
              x={i * 45}
              width={30}
              animatedProps={animatedProps}
              fill="#4a90e2"
              rx={6}
            />
          );
        })}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Text key={d} style={{ width: 45, textAlign: 'center' }}>{d}</Text>
        ))}
      </View>
    </View>
  );
}
