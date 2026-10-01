import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

type Props = {
  // For each day (Sun..Sat): the priority colours of the tasks completed that
  // day, in the order they were completed. Each colour becomes one stacked block.
  data: string[][];
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeeklyBarChart({ data }: Props) {
  const colWidth = 45;
  const barWidth = 30;
  const baseline = 140;
  const plotHeight = 115;

  // Keep a sensible minimum scale so a single task doesn't make a giant bar
  const maxCount = Math.max(5, ...data.map((d) => d.length));
  const unit = plotHeight / maxCount;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: 16, marginBottom: 6 }}>Completed This Week</Text>

      <Svg width={colWidth * 7} height={160}>
        {data.map((colors, i) => {
          const x = i * colWidth + (colWidth - barWidth) / 2;
          return (
            <React.Fragment key={i}>
              {colors.map((color, j) => (
                <Rect
                  key={j}
                  x={x}
                  y={baseline - (j + 1) * unit + 1}
                  width={barWidth}
                  height={Math.max(unit - 2, 2)}
                  fill={color}
                  rx={4}
                />
              ))}
              {colors.length > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={baseline - colors.length * unit - 4}
                  fontSize={12}
                  fill="#333"
                  textAnchor="middle"
                >
                  {colors.length}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {DAYS.map((d) => (
          <Text key={d} style={{ width: colWidth, textAlign: 'center' }}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}
