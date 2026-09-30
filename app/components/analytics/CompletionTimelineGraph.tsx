import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';

// Animated SVG rect
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function CompletionTimelineGraph({ timelineData }) {
  /**
   * timelineData format:
   * [
   *   { date: "2026-09-25", early: 2, onTime: 1, late: 0 },
   *   { date: "2026-09-26", early: 0, onTime: 3, late: 1 },
   *   ...
   * ]
   */

  const max = Math.max(
    ...timelineData.map((d) => d.early + d.onTime + d.late),
    1
  );

  return (
    <View style={{ marginTop: 30, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 10 }}>
        Completion Timeline
      </Text>

      <Svg width={timelineData.length * 70} height={260}>
        {timelineData.map((d, i) => {
          const total = d.early + d.onTime + d.late;

          // Animated heights
          const earlyHeight = useSharedValue(0);
          const onTimeHeight = useSharedValue(0);
          const lateHeight = useSharedValue(0);

          useEffect(() => {
            earlyHeight.value = withTiming((d.early / max) * 180, { duration: 600 });
            onTimeHeight.value = withTiming((d.onTime / max) * 180, { duration: 600 });
            lateHeight.value = withTiming((d.late / max) * 180, { duration: 600 });
          }, [d]);

          const earlyProps = useAnimatedProps(() => ({
            height: earlyHeight.value,
            y: 200 - earlyHeight.value,
          }));

          const onTimeProps = useAnimatedProps(() => ({
            height: onTimeHeight.value,
            y: 200 - earlyHeight.value - onTimeHeight.value,
          }));

          const lateProps = useAnimatedProps(() => ({
            height: lateHeight.value,
            y: 200 - earlyHeight.value - onTimeHeight.value - lateHeight.value,
          }));

          return (
            <React.Fragment key={i}>
              {/* Early (green) */}
              <AnimatedRect
                x={i * 70 + 20}
                width={40}
                animatedProps={earlyProps}
                fill="#2ecc71"
                rx={4}
              />

              {/* On-Time (yellow) */}
              <AnimatedRect
                x={i * 70 + 20}
                width={40}
                animatedProps={onTimeProps}
                fill="#f1c40f"
                rx={4}
              />

              {/* Late (red) */}
              <AnimatedRect
                x={i * 70 + 20}
                width={40}
                animatedProps={lateProps}
                fill="#e74c3c"
                rx={4}
              />

              {/* Numbers above bar */}
              <Text
                style={{
                  position: 'absolute',
                  left: i * 70 + 35,
                  top: 210,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {total}
              </Text>

              {/* Date label */}
              <Text
                style={{
                  position: 'absolute',
                  left: i * 70 + 10,
                  top: 230,
                  width: 70,
                  textAlign: 'center',
                  fontSize: 12,
                }}
              >
                {new Date(d.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
