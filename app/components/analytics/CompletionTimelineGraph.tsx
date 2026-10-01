import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";

const priorityColors = {
  "urgent-important": "#2ecc71",
  "urgent-not-important": "#3498db",
  "not-urgent-important": "#f39c12",
  "not-urgent-not-important": "#e74c3c",
};

export default function CompletionTimelineGraph({ tasks, range }) {
  // 1. Build date range
  const today = new Date();
  const start = new Date();

  if (range === "today") {
    // start = today
  } else if (range === "week") {
    start.setDate(today.getDate() - 6);
  } else if (range === "month") {
    start.setDate(today.getDate() - 29);
  } else {
    // since start — earliest task date
    const earliest = tasks.reduce((acc, t) => {
      const d = new Date(t.completedAt);
      return d < acc ? d : acc;
    }, today);
    start.setTime(earliest.getTime());
  }

  // 2. Build list of days
  const days = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // 3. Group tasks by day
  const grouped = days.map((day) => {
    const dayStr = day.toISOString().split("T")[0];
    const dayTasks = tasks.filter(
      (t) => t.completedAt.split("T")[0] === dayStr
    );
    return { day, tasks: dayTasks };
  });

  // 4. Determine Y-axis max
  const maxTasks = Math.max(
    1,
    ...grouped.map((g) => g.tasks.length)
  );
  const yMax = maxTasks + 1;

  const chartHeight = 200;
  const barWidth = 12;
  const barSpacing = 4;
  const daySpacing = 40;

  return (
    <View style={{ marginTop: 20 }}>
      {/* Legend */}
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        {Object.entries(priorityColors).map(([key, color]) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: color,
                marginRight: 4,
                borderRadius: 3,
              }}
            />
            <Text style={{ fontSize: 12 }}>
              {key.replace(/-/g, " ")}
            </Text>
          </View>
        ))}
      </View>

      {/* Y-axis numbers */}
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 30 }}>
          {Array.from({ length: yMax }).map((_, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                bottom: (chartHeight / yMax) * i - 6,
                fontSize: 12,
              }}
            >
              {i}
            </Text>
          ))}
        </View>

        {/* Scrollable timeline */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg height={chartHeight} width={days.length * daySpacing}>
            {/* Horizontal grid lines */}
            {Array.from({ length: yMax }).map((_, i) => (
              <Line
                key={i}
                x1={0}
                y1={chartHeight - (chartHeight / yMax) * i}
                x2={days.length * daySpacing}
                y2={chartHeight - (chartHeight / yMax) * i}
                stroke="#ddd"
                strokeWidth={1}
              />
            ))}

            {/* Bars */}
            {grouped.map((g, dayIndex) => {
              return g.tasks.map((task, barIndex) => {
                const barHeight =
                  (g.tasks.length / yMax) * chartHeight;

                return (
                  <Rect
                    key={task.id}
                    x={
                      dayIndex * daySpacing +
                      barIndex * (barWidth + barSpacing)
                    }
                    y={chartHeight - barHeight}
                    width={barWidth}
                    height={barHeight}
                    fill={priorityColors[task.priority]}
                    rx={3}
                  />
                );
              });
            })}

            {/* X-axis labels */}
            {grouped.map((g, dayIndex) => (
              <SvgText
                key={dayIndex}
                x={dayIndex * daySpacing + 10}
                y={chartHeight - 2}
                fontSize={10}
                fill="#333"
                textAnchor="middle"
              >
                {g.day.getDate()}
              </SvgText>
            ))}
          </Svg>
        </ScrollView>
      </View>
    </View>
  );
}
