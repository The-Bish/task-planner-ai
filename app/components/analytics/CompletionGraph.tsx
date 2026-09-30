import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export default function CompletionGraph({ analytics }) {
  const { early, onTime, late } = analytics;

  const max = Math.max(early, onTime, late, 1);

  const bars = [
    { label: 'Early', value: early, color: '#8EE6A8' },
    { label: 'On-Time', value: onTime, color: '#FFEAA7' },
    { label: 'Late', value: late, color: '#FF8F8F' },
  ];

  return (
    <View style={{ marginTop: 30, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 10 }}>
        Completion Status
      </Text>

      <Svg width={bars.length * 80} height={200}>
        {bars.map((b, i) => {
          const height = (b.value / max) * 140;
          const y = 160 - height;

          return (
            <Rect
              key={b.label}
              x={i * 80 + 20}
              y={y}
              width={50}
              height={height}
              fill={b.color}
              rx={10}
            />
          );
        })}
      </Svg>

      {bars.map((b, i) => (
        <Text
          key={b.label + '-label'}
          style={{
            marginTop: 4,
            width: 80,
            textAlign: 'center',
            fontSize: 12,
          }}
        >
          {b.label}
        </Text>
      ))}
    </View>
  );
}
