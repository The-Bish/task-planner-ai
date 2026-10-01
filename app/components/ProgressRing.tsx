import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

type Props = {
  // One entry per task for today. A colour = completed (in that priority colour),
  // null = still open (shown grey).
  segments: (string | null)[];
  done: number;
};

const EMPTY_COLOR = '#e0e0e0';

export default function ProgressRing({ segments, done }: Props) {
  const size = 150;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.length;

  const segLen = total > 0 ? circumference / total : circumference;
  const gap = total > 1 ? Math.min(5, segLen * 0.3) : 0;
  const dash = Math.max(segLen - gap, 0.5);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {total === 0 ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={EMPTY_COLOR}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            segments.map((color, i) => (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color ?? EMPTY_COLOR}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={[dash, circumference - dash]}
                strokeDashoffset={-(i * segLen)}
              />
            ))
          )}
        </G>
      </Svg>

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000' }}>
          {done}/{total}
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>tasks done</Text>
      </View>
    </View>
  );
}
