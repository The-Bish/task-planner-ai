import React from 'react';
import { View, Text } from 'react-native';
import { priorityColors, priorityLabels } from '../theme/priorityColors';

// One legend that explains the colours for the whole dashboard.
export default function PriorityLegend() {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 14,
      }}
    >
      {Object.keys(priorityColors).map((key) => (
        <View
          key={key}
          style={{
            width: '50%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 4,
            paddingRight: 6,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              marginRight: 6,
              backgroundColor: priorityColors[key],
            }}
          />
          <Text style={{ fontSize: 12, color: '#000', flexShrink: 1 }}>
            {priorityLabels[key]}
          </Text>
        </View>
      ))}
    </View>
  );
}
