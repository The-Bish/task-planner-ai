import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Task = {
  id: string;
  title: string;
  priority: string;
  completedAt: string;
  completionStatus: string;
  isCompleted: boolean;
};

type Option = { value: string | null; label: string };

const priorityColors: Record<string, string> = {
  "urgent-important": "#2ecc71",
  "urgent-not-important": "#3498db",
  "not-urgent-important": "#f39c12",
  "not-urgent-not-important": "#e74c3c",
};

const priorityLabels = [
  { value: "urgent-important", label: "Urgent & Important", short: ["Urgent", "& Important"] },
  { value: "urgent-not-important", label: "Urgent & Not Important", short: ["Urgent", "& Not Imp."] },
  { value: "not-urgent-important", label: "Not Urgent & Important", short: ["Not Urgent", "& Important"] },
  { value: "not-urgent-not-important", label: "Not Urgent & Not Important", short: ["Not Urgent", "& Not Imp."] },
];

const priorityOptions: Option[] = [
  { value: null, label: "All Priorities" },
  ...priorityLabels.map((p) => ({ value: p.value, label: p.label })),
];

const timelineOptions: Option[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "Since Start" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatShortDate = (d: Date) =>
  `${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("default", {
    month: "short",
  })}`;

// Local-time date key (avoids the UTC off-by-one-day problem)
const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/* Reusable option picker modal (looks the same on iOS/Android/web)    */
/* ------------------------------------------------------------------ */

function OptionModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((o) => {
            const isSelected = o.value === selected;
            return (
              <TouchableOpacity
                key={String(o.value)}
                style={styles.optionRow}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {o.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
            );
          })}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ArchiveScreen() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [timelineRange, setTimelineRange] = useState("week");

  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showTimelinePicker, setShowTimelinePicker] = useState(false);

  const timelineScrollRef = useRef<ScrollView>(null);

  // Reload tasks every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadTasks = async () => {
        try {
          const raw = await AsyncStorage.getItem("tasks");
          if (!raw) {
            setAllTasks([]);
            return;
          }
          const parsed: Task[] = JSON.parse(raw);
          setAllTasks(parsed.filter((t) => t.isCompleted && t.completedAt));
        } catch (e) {
          console.warn("Failed to load tasks", e);
          setAllTasks([]);
        }
      };
      loadTasks();
    }, [])
  );

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
    filteredTasks.forEach((t) => {
      if (t.priority in counts) counts[t.priority]++;
    });
    return counts;
  }, [filteredTasks]);

  const maxPriorityCount = Math.max(
    1,
    ...Object.values(priorityCounts).map((v) => v || 0)
  );

  // Timeline range (all dates normalised to midnight local time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);

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
      if (isNaN(d.getTime())) return acc;
      d.setHours(0, 0, 0, 0);
      return d < acc ? d : acc;
    }, new Date(today));
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
    const dayStr = toKey(day);
    const dayTasks = filteredTasks.filter(
      (t) => toKey(new Date(t.completedAt)) === dayStr
    );

    // Reverse priority order
    const ordered = [
      "not-urgent-not-important",
      "not-urgent-important",
      "urgent-not-important",
      "urgent-important",
    ].flatMap((p) => dayTasks.filter((t) => t.priority === p));

    return { day, tasks: ordered };
  });

  // Timeline sizing: everything is derived from one "unit" so bars,
  // grid lines and Y-axis labels always line up.
  const maxTasksPerDay = Math.max(1, ...grouped.map((g) => g.tasks.length));
  const yMax = maxTasksPerDay + 1;

  const timelineHeight = 220;
  const labelPad = 22; // space at the bottom for date labels
  const plotHeight = timelineHeight - labelPad;
  const unit = plotHeight / yMax;
  const barWidth = 16;
  const daySpacing = 40;

  const priorityLabelFor = (p: string) =>
    priorityLabels.find((x) => x.value === p)?.label ?? p.replace(/-/g, " ");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Archive & Analytics</Text>

      {/* Priority filter button */}
      <View style={{ marginVertical: 20 }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowPriorityPicker(true)}
        >
          <Text style={styles.filterButtonText}>
            {priorityFilter
              ? priorityLabelFor(priorityFilter)
              : "Filter by Priority"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Timeline filter button */}
      <View style={{ marginVertical: 10 }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowTimelinePicker(true)}
        >
          <Text style={styles.filterButtonText}>
            {timelineOptions.find((o) => o.value === timelineRange)?.label}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <OptionModal
        visible={showPriorityPicker}
        title="Select Priority"
        options={priorityOptions}
        selected={priorityFilter}
        onSelect={setPriorityFilter}
        onClose={() => setShowPriorityPicker(false)}
      />
      <OptionModal
        visible={showTimelinePicker}
        title="Timeline Range"
        options={timelineOptions}
        selected={timelineRange}
        onSelect={(v) => setTimelineRange(v ?? "week")}
        onClose={() => setShowTimelinePicker(false)}
      />

      {/* Legend */}
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

      {/* Priority graph */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tasks by Priority</Text>

        <Svg width={320} height={190}>
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
                  {p.short[0]}
                </SvgText>
                <SvgText
                  x={x + 20}
                  y={178}
                  fontSize={10}
                  fill="#555"
                  textAnchor="middle"
                >
                  {p.short[1]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Timeline graph */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Completion Timeline</Text>

        <View style={{ flexDirection: "row" }}>
          {/* Y-axis numbers */}
          <View style={{ width: 30, height: timelineHeight }}>
            {Array.from({ length: yMax }).map((_, i) => (
              <Text
                key={i}
                style={{
                  position: "absolute",
                  bottom: labelPad + unit * i - 7,
                  fontSize: 12,
                  color: "#333",
                }}
              >
                {i}
              </Text>
            ))}
          </View>

          {/* Scrollable timeline (starts scrolled to the most recent day) */}
          <ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() =>
              timelineScrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            <Svg height={timelineHeight} width={days.length * daySpacing}>
              {/* Grid lines */}
              {Array.from({ length: yMax }).map((_, i) => (
                <Line
                  key={i}
                  x1={0}
                  y1={plotHeight - unit * i}
                  x2={days.length * daySpacing}
                  y2={plotHeight - unit * i}
                  stroke="#ddd"
                  strokeWidth={1}
                />
              ))}

              {/* Bars (stacked upward) */}
              {grouped.map((g, dayIndex) =>
                g.tasks.map((task, barIndex) => {
                  const x = dayIndex * daySpacing + 10 - barWidth / 2;
                  const y = plotHeight - (barIndex + 1) * unit;

                  return (
                    <Rect
                      key={`${dayIndex}-${task.id}`}
                      x={x}
                      y={y + 1}
                      width={barWidth}
                      height={Math.max(unit - 2, 2)}
                      fill={priorityColors[task.priority] ?? "#999"}
                      rx={3}
                    />
                  );
                })
              )}

              {/* Year-change markers */}
              {grouped.map((g, dayIndex) => {
                if (
                  dayIndex > 0 &&
                  g.day.getFullYear() !==
                    grouped[dayIndex - 1].day.getFullYear()
                ) {
                  const x = dayIndex * daySpacing + 10;

                  return (
                    <React.Fragment key={`year-${dayIndex}`}>
                      <Line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={plotHeight}
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
                    </React.Fragment>
                  );
                }
                return null;
              })}

              {/* X-axis date labels */}
              {grouped.map((g, dayIndex) => (
                <SvgText
                  key={`label-${dayIndex}`}
                  x={dayIndex * daySpacing + 10}
                  y={timelineHeight - 6}
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

      {/* Filtered task list */}
      <View style={{ marginTop: 30 }}>
        <Text style={styles.sectionTitle}>Filtered Tasks</Text>

        {filteredTasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks match this filter.</Text>
        ) : (
          filteredTasks.map((task) => {
            const color = priorityColors[task.priority] ?? "#999";
            const label = priorityLabelFor(task.priority);

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

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

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
    color: "#000",
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
    color: "#000",
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
    color: "#000",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  optionText: {
    fontSize: 16,
    color: "#000",
  },
  optionTextSelected: {
    fontWeight: "bold",
    color: "#3498db",
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
    color: "#000",
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
    color: "#000",
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
    color: "#000",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
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
    color: "#000",
  },
  taskLine: {
    marginTop: 4,
  },
});
