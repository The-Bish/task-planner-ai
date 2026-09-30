import React from 'react';
import { View, Text } from 'react-native';

export default function DashboardAnalyticsRow({
  early,
  onTime,
  late,
}: {
  early: number;
  onTime: number;
  late: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingHorizontal: 4,
      }}
    >
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#2ecc71' }}>
          {early}
        </Text>
        <Text style={{ fontSize: 14, color: '#555' }}>Early</Text>
      </View>

      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#f1c40f' }}>
          {onTime}
        </Text>
        <Text style={{ fontSize: 14, color: '#555' }}>On Time</Text>
      </View>

      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#e74c3c' }}>
          {late}
        </Text>
        <Text style={{ fontSize: 14, color: '#555' }}>Late</Text>
      </View>
    </View>
  );
}
