import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Button,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";

type Task = {
  id: string;
  title: string;
  priority: string;
  completedAt: string;
  completionStatus: string;
  isCompleted: boolean;
};

const priorityColors: Record<string, string> = {
  "urgent-important": "#2ecc71",
  "urgent-not-important": "#3498db",
  "not-urgent-important": "#f39c12",
  "not-urgent-not-important": "#e74c3c",
};

const priorityLabels = [
  { value: "urgent-important", label: "Urgent & Important" },
  { value: "urgent-not-important", label: "Urgent & Not Important" },
  { value: "not-urgent-important", label: "Not Urgent & Important" },
  { value: "not-urgent-not-important", label: "Not Urgent & Not Important" },
];

const formatShortDate = (d: Date) =>
  `${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("default", {
    month: "short",
  })}`;

export default function ArchiveScreen() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [timelineRange, setTimelineRange] = useState("week");

  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showTimelinePicker, setShowTimelinePicker] = useState(false);

  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      const raw = await AsyncStorage.getItem("tasks");
      if (!raw) return;
      const parsed: Task[] = JSON.parse(raw);
      setAllTasks(parsed.filter((t) => t.isCompleted));
    };
    loadTasks();
  }, []);

  // Apply priority filter
  const filteredTasks = useMemo(() => {
    return priorityFilter
      ? allTasks.filter((t) => t.priority === priorityFilter)
      : allTasks;
  }, [allTasks, priorityFilter]);

  // Priority graph counts
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "urgent-important": 0,
      "urgent-not-important": 0,
      "not-urgent-important": 0,
      "not-urgent-not-important": 0,
    };
    filteredTasks.forEach((t) => counts[t.priority]++);
    return counts;
  }, [filteredTasks]);

  const maxPriorityCount = Math.max(
    1,
    ...Object.values(priorityCounts).map((v) => v || 0)
  );

  // Timeline range
  const today = new Date();
  const start = new Date();

  if (timelineRange === "today") {
    // start = today
  } else if (timelineRange === "week") {
    start.setDate(today.getDate() - 6);
  } else if (timelineRange === "month") {
    start.setDate(today.getDate() - 29);
  } else {
    // since start
    const earliest = filteredTasks.reduce((acc, t) => {
      const d = new Date(t.completedAt);
      return d < acc ? d : acc;
    }, today);
    start.setTime(earliest.getTime());
  }

  // Build days
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Group tasks by day
  const grouped = days.map((day) => {
    const dayStr = day.toISOString().split("T")[0];
    const dayTasks = filteredTasks.filter(
      (t) => t.completedAt.split("T")[0] === dayStr
    );

    // Reverse priority order (Option 3)
    const ordered = [
      "not-urgent-not-important",
      "not-urgent-important",
      "urgent-not-important",
      "urgent-important",
    ].flatMap((p) => dayTasks.filter((t) => t.priority === p));

    return { day, tasks: ordered };
  });

  // Y-axis max
  const maxTasksPerDay = Math.max(
    1,
    ...grouped.map((g) => g.tasks.length)
  );
  const yMax = maxTasksPerDay + 1;

  const timelineHeight = 200;
  const barSize = 12;
  const daySpacing = 40;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Archive & Analytics</Text>

      {/* Priority Picker */}
      <View style={{ marginVertical: 20 }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowPriorityPicker(true)}
        >
          <Text style={styles.filterButtonText}>
            {priorityFilter
              ? priorityLabels.find((p) => p.value === priorityFilter)?.label
              : "Filter by Priority"}
          </Text>
          <Ionicons name="chevron-down" size={20} />
        </TouchableOpacity>

        {showPriorityPicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Priority</Text>
                <Picker
                  selectedValue={priorityFilter}
                  onValueChange={(v) => setPriorityFilter(v)}
                  style={{ color: "#000" }}
                >
                  <Picker.Item label="All Priorities" value={null} />
                  {priorityLabels.map((p) => (
                    <Picker.Item key={p.value} label={p.label} value={p.value} />
                  ))}
                </Picker>
                <Button title="Done" onPress={() => setShowPriorityPicker(false)} />
              </View>
            </View>
          </Modal>
        )}
      </View>

      {/* Timeline Picker */}
      <View style={{ marginVertical: 10 }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowTimelinePicker(true)}
        >
          <Text style={styles.filterButtonText}>
            {timelineRange === "today"
              ? "Today"
              : timelineRange === "week"
              ? "This Week"
              : timelineRange === "month"
              ? "This Month"
              : "Since Start"}
          </Text>
          <Ionicons name="chevron-down" size={20} />
        </TouchableOpacity>

        {showTimelinePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Timeline Range</Text>
                <Picker
                  selectedValue={timelineRange}
                  onValueChange={(v) => setTimelineRange(v)}
                  style={{ color: "#000" }}
                >
                  <Picker.Item label="Today" value="today" />
                  <Picker.Item label="This Week" value="week" />
                  <Picker.Item label="This Month" value="month" />
                  <Picker.Item label="Since Start" value="all" />
                </Picker>
                <Button title="Done" onPress={() => setShowTimelinePicker(false)} />
              </View>
            </View>
          </Modal>
        )}
      </View>

      {/* Permanent Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendHeader}>Legend</Text>
        {priorityLabels.map((p) => (
          <View key={p.value} style={styles.legendRow}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: priorityColors[p.value] },
              ]}
            />
            <Text style={styles.legendText}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* Priority Graph */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tasks by Priority</Text>

        <Svg width={320} height={180}>
          {priorityLabels.map((p, index) => {
            const count = priorityCounts[p.value];
            const barHeight = (count / maxPriorityCount) * 120;
            const x = 20 + index * 70;
            const y = 150 - barHeight;

            return (
              <React.Fragment key={p.value}>
                <Rect
                  x={x}
                  y={y}
                  width={40}
                  height={barHeight}
                  fill={priorityColors[p.value]}
                  rx={6}
                />
                <SvgText
                  x={x + 20}
                  y={y - 6}
                  fontSize={12}
                  fill="#333"
                  textAnchor="middle"
                >
                  {count}
                </SvgText>
                <SvgText
                  x={x + 20}
                  y={165}
                  fontSize={10}
                  fill="#555"
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Timeline Graph */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Completion Timeline</Text>

        <View style={{ flexDirection: "row" }}>
          {/* Y-axis numbers */}
          <View style={{ width: 30 }}>
            {Array.from({ length: yMax }).map((_, i) => (
              <Text
                key={i}
                style={{
                  position: "absolute",
                  bottom: (timelineHeight / yMax) * i - 6,
                  fontSize: 12,
                }}
              >
                {i}
              </Text>
            ))}
          </View>

          {/* Scrollable timeline */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg height={timelineHeight} width={days.length * daySpacing}>
              {/* Grid lines */}
              {Array.from({ length: yMax }).map((_, i) => (
                <Line
                  key={i}
                  x1={0}
                  y1={timelineHeight - (timelineHeight / yMax) * i}
                  x2={days.length * daySpacing}
                  y2={timelineHeight - (timelineHeight / yMax) * i}
                  stroke="#ddd"
                  strokeWidth={1}
                />
              ))}

              {/* Bars (stacked upward) */}
              {grouped.map((g, dayIndex) =>
                g.tasks.map((task, barIndex) => {
                  const x = dayIndex * daySpacing + 10;
                  const y =
                    timelineHeight -
                    (barIndex + 1) * barSize;

                  return (
                    <Rect
                      key={task.id}
                      x={x}
                      y={y}
                      width={barSize}
                      height={barSize}
                      fill={priorityColors[task.priority]}
                      rx={3}
                    />
                  );
                })
              )}

              {/* Year-change markers */}
{grouped.map((g, dayIndex) => {
  if (
    dayIndex > 0 &&
    g.day.getFullYear() !== grouped[dayIndex - 1].day.getFullYear()
  ) {
    const x = dayIndex * daySpacing + 10;

    return (
      <>
        <Line
          x1={x}
          y1={0}
          x2={x}
          y2={timelineHeight}
          stroke="#000"
          strokeWidth={1.5}
        />
        <SvgText
          x={x}
          y={14}
          fontSize={12}
          fill="#000"
          textAnchor="middle"
          fontWeight="bold"
        >
          {g.day.getFullYear()}
        </SvgText>
      </>
    );
  }
  return null;
})}


              {/* X-axis labels */}
              {grouped.map((g, dayIndex) => (
                <SvgText
                  key={dayIndex}
                  x={dayIndex * daySpacing + 10}
                  y={timelineHeight - 2}
                  fontSize={10}
                  fill="#333"
                  textAnchor="middle"
                >
                  {formatShortDate(g.day)}
                </SvgText>
              ))}
            </Svg>
          </ScrollView>
        </View>
      </View>

      {/* Filtered Task List */}
      <View style={{ marginTop: 30 }}>
        <Text style={styles.sectionTitle}>Filtered Tasks</Text>

        {filteredTasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks match this filter.</Text>
        ) : (
          filteredTasks.map((task) => {
            const color = priorityColors[task.priority];
            const label =
              priorityLabels.find((p) => p.value === task.priority)?.label ??
              task.priority.replace(/-/g, " ");

            return (
              <View key={task.id} style={styles.taskCardWrapper}>
                <View
                  style={[styles.taskColorBar, { backgroundColor: color }]}
                />
                <View style={styles.taskCardContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskLine}>
                    Completed: {formatShortDate(new Date(task.completedAt))}
                  </Text>
                  <Text style={[styles.taskLine, { color }]}>
                    Priority: {label}
                  </Text>
                  <Text style={[styles.taskLine, { color: "#555" }]}>
                    Status: {task.completionStatus}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  filterButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  filterButtonText: {
    fontSize: 16,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#00000055",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  legendContainer: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legendHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    color: "#777",
  },

  taskCardWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskColorBar: {
    width: 10,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  taskCardContent: {
    padding: 12,
    flex: 1,
  },
  taskTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  taskLine: {
    marginTop: 4,
  },
});

