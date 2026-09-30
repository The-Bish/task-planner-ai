import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export default function PriorityGraph({ tasks }) {
  const counts = {
    'urgent-important': 0,
    'urgent-not-important': 0,
    'not-urgent-important': 0,
    'not-urgent-not-important': 0,
  };

  tasks.forEach(t => {
    if (t.priority) counts[t.priority]++;
  });

  const max = Math.max(...Object.values(counts), 1);

  const colors = {
    'urgent-important': '#2ecc71',
    'urgent-not-important': '#3498db',
    'not-urgent-important': '#f39c12',
    'not-urgent-not-important': '#e74c3c',
  };

  const labels = {
    'urgent-important': 'Urgent & Important',
    'urgent-not-important': 'Urgent & Not Important',
    'not-urgent-important': 'Not Urgent & Important',
    'not-urgent-not-important': 'Not Urgent & Not Important',
  };

  const keys = Object.keys(counts);

  return (
    <View style={{ marginTop: 30, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 10 }}>
        Priority Breakdown
      </Text>

      <Svg width={keys.length * 80} height={200}>
        {keys.map((key, i) => {
          const height = (counts[key] / max) * 140;
          const y = 160 - height;

          return (
            <Rect
              key={key}
              x={i * 80 + 20}
              y={y}
              width={50}
              height={height}
              fill={colors[key]}
              rx={10}
            />
          );
        })}
      </Svg>

      {keys.map((key, i) => (
        <Text
          key={key + '-label'}
          style={{
            marginTop: 4,
            width: 80,
            textAlign: 'center',
            fontSize: 12,
          }}
        >
          {labels[key]}
        </Text>
      ))}
    </View>
  );
}
