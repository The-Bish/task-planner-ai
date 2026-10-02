import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { loadActiveTasks, loadCompletedTasks } from '../storage/taskStorage';
import PriorityLegend from '../components/PriorityLegend';
import { getPriorityColor } from '../theme/priorityColors';

const WEEK_W = 84; // width of one week
const DAY_W = WEEK_W / 7; // width of one day
const ROW_H = 76; // height of one task row
const HEADER_H = 56; // month + week header
const LEFT_W = 112; // task name column
const BAR_Y = 12;
const BAR_H = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

type Milestone = { id: string; title: string; date: Date; done: boolean };
type Row = {
  id: string;
  title: string;
  priority: string;
  start: Date;
  end: Date;
  milestones: Milestone[];
  done: number;
  total: number;
};
type Chart = { rows: Row[]; rangeStart: Date; totalWeeks: number; hiddenCount: number };

const midnight = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

// Monday of the week containing d
const mondayOf = (d: Date) => {
  const c = midnight(d);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
};

// ISO week number (weeks start on Monday)
const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
};

const shortDate = (d: Date) =>
  `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;

const clip = (t: string, n = 12) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

export default function GanttScreen() {
  const [chart, setChart] = useState<Chart | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const didScroll = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const active = await loadActiveTasks();
        const completed = await loadCompletedTasks();
        const doneIds = new Set(completed.map((t: any) => t.id));
        const everything = [...active, ...completed];
        const today = midnight(new Date());

        // Main tasks (not milestones) that have a due date
        const mains = active.filter((t: any) => !t.parentId);
        const withDates = mains.filter((t: any) => t.dueDate);

        const rows: Row[] = withDates.map((t: any) => {
          const end = midnight(new Date(t.dueDate));
          let start = t.createdAt ? midnight(new Date(t.createdAt)) : today;
          if (start > end) start = end;

          const milestones: Milestone[] = everything
            .filter((m: any) => m.parentId === t.id && m.dueDate)
            .map((m: any) => ({
              id: m.id,
              title: m.title,
              date: midnight(new Date(m.dueDate)),
              done: doneIds.has(m.id),
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            start,
            end,
            milestones,
            done: milestones.filter((m) => m.done).length,
            total: milestones.length,
          };
        });

        // Work out the date range to draw
        let min = today;
        let max = today;
        rows.forEach((r) => {
          if (r.start < min) min = r.start;
          if (r.end > max) max = r.end;
          r.milestones.forEach((m) => {
            if (m.date < min) min = m.date;
            if (m.date > max) max = m.date;
          });
        });
        // Whole weeks, Monday to Sunday, with a spare week at the end
        const rangeStart = mondayOf(min);
        const totalWeeks =
          Math.round((mondayOf(max).getTime() - rangeStart.getTime()) / (7 * DAY_MS)) + 2;

        didScroll.current = false;
        setChart({
          rows,
          rangeStart,
          totalWeeks,
          hiddenCount: mains.length - withDates.length,
        });
      };
      load();
    }, [])
  );

  if (!chart || chart.rows.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.empty}>
          {chart && chart.hiddenCount > 0
            ? 'Your tasks don’t have due dates yet. Add a due date to see them on the timeline.'
            : 'No tasks to show yet. Add a task with a due date and it will appear here.'}
        </Text>
      </ScrollView>
    );
  }

  const { rows, rangeStart, totalWeeks, hiddenCount } = chart;
  const dayIdx = (d: Date) =>
    Math.round((midnight(d).getTime() - rangeStart.getTime()) / DAY_MS);
  const xOf = (d: Date) => dayIdx(d) * DAY_W;
  const svgWidth = totalWeeks * WEEK_W;
  const svgHeight = HEADER_H + rows.length * ROW_H;
  const todayX = xOf(new Date()) + DAY_W / 2;
  const rangeEnd = new Date(rangeStart.getTime() + totalWeeks * 7 * DAY_MS);

  // Month sections across the top
  const months: { label: string; x: number; width: number }[] = [];
  {
    let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cur < rangeEnd) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const from = cur < rangeStart ? rangeStart : cur;
      const to = next > rangeEnd ? rangeEnd : next;
      const x = xOf(from);
      const width = ((to.getTime() - from.getTime()) / DAY_MS) * DAY_W;
      const long = `${cur.toLocaleString('default', { month: 'long' })} ${cur.getFullYear()}`;
      const short = cur.toLocaleString('default', { month: 'short' });
      months.push({ label: width >= 120 ? long : width >= 40 ? short : '', x, width });
      cur = next;
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Timeline</Text>

      <PriorityLegend />
      <Text style={styles.keyText}>
        Each column is one week.     ○ milestone to do     ● milestone done
      </Text>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row' }}>
          {/* Task names (fixed on the left) */}
          <View style={{ width: LEFT_W }}>
            <View style={{ height: HEADER_H }} />
            {rows.map((r) => (
              <View key={r.id} style={styles.nameCell}>
                <Text style={styles.nameText} numberOfLines={2}>
                  {r.title}
                </Text>
                {r.total > 0 && (
                  <Text style={styles.subText}>
                    {r.done}/{r.total} milestones
                  </Text>
                )}
                <Text style={styles.subText}>Due {shortDate(r.end)}</Text>
              </View>
            ))}
          </View>

          {/* Scrollable chart */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => {
              if (!didScroll.current) {
                didScroll.current = true;
                scrollRef.current?.scrollTo({
                  x: Math.max(0, todayX - 100),
                  animated: false,
                });
              }
            }}
          >
            <Svg width={svgWidth} height={svgHeight}>
              {/* Month sections */}
              {months.map((m, i) => (
                <React.Fragment key={`month-${i}`}>
                  <Rect
                    x={m.x}
                    y={0}
                    width={m.width}
                    height={24}
                    fill={i % 2 === 0 ? '#eef3fa' : '#e3ebf5'}
                  />
                  <Line x1={m.x} y1={0} x2={m.x} y2={svgHeight} stroke="#bbb" strokeWidth={1} />
                  <SvgText x={m.x + 6} y={16} fontSize={11} fontWeight="bold" fill="#333">
                    {m.label}
                  </SvgText>
                </React.Fragment>
              ))}

              {/* Week columns: week number + the Monday's date */}
              {Array.from({ length: totalWeeks }).map((_, i) => {
                const monday = new Date(rangeStart.getTime() + i * 7 * DAY_MS);
                return (
                  <React.Fragment key={`week-${i}`}>
                    <Line
                      x1={i * WEEK_W}
                      y1={24}
                      x2={i * WEEK_W}
                      y2={svgHeight}
                      stroke="#e6e6e6"
                      strokeWidth={1}
                    />
                    <SvgText
                      x={i * WEEK_W + WEEK_W / 2}
                      y={39}
                      fontSize={12}
                      fontWeight="bold"
                      fill="#333"
                      textAnchor="middle"
                    >
                      {`W${isoWeek(monday)}`}
                    </SvgText>
                    <SvgText
                      x={i * WEEK_W + WEEK_W / 2}
                      y={51}
                      fontSize={9}
                      fill="#777"
                      textAnchor="middle"
                    >
                      {shortDate(monday)}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Row dividers */}
              {rows.map((_, i) => (
                <Line
                  key={`row-${i}`}
                  x1={0}
                  y1={HEADER_H + i * ROW_H}
                  x2={svgWidth}
                  y2={HEADER_H + i * ROW_H}
                  stroke="#ddd"
                  strokeWidth={1}
                />
              ))}

              {/* Bars + milestones */}
              {rows.map((r, i) => {
                const color = getPriorityColor(r.priority);
                const barY = HEADER_H + i * ROW_H + BAR_Y;
                const x = xOf(r.start);
                const w = Math.max(xOf(r.end) + DAY_W - x, 14);
                const progressW = r.total > 0 ? (w * r.done) / r.total : 0;

                return (
                  <React.Fragment key={r.id}>
                    <Rect x={x} y={barY} width={w} height={BAR_H} rx={8} fill={color} opacity={0.3} />
                    {progressW > 0 && (
                      <Rect x={x} y={barY} width={progressW} height={BAR_H} rx={8} fill={color} />
                    )}

                    {r.milestones.map((m, mi) => {
                      const cx = xOf(m.date) + DAY_W / 2;
                      return (
                        <React.Fragment key={m.id}>
                          <Circle
                            cx={cx}
                            cy={barY + BAR_H / 2}
                            r={8}
                            fill={m.done ? color : '#fff'}
                            stroke={m.done ? '#fff' : color}
                            strokeWidth={2.5}
                          />
                          <SvgText
                            x={cx}
                            y={barY + BAR_H + 15 + (mi % 2) * 12}
                            fontSize={9}
                            fill="#333"
                            textAnchor="middle"
                          >
                            {clip(m.title)}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Today marker */}
              <Line x1={todayX} y1={24} x2={todayX} y2={svgHeight} stroke="#e74c3c" strokeWidth={1.5} />
              <SvgText x={todayX} y={21} fontSize={9} fill="#e74c3c" fontWeight="bold" textAnchor="middle">
                Today
              </SvgText>
            </Svg>
          </ScrollView>
        </View>
      </View>

      {hiddenCount > 0 && (
        <Text style={styles.footer}>
          {hiddenCount} task{hiddenCount !== 1 ? 's' : ''} without a due date
          {hiddenCount !== 1 ? ' aren’t' : ' isn’t'} shown.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 16 },
  empty: { fontSize: 16, color: '#777' },
  keyText: { fontSize: 12, color: '#555', marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  nameCell: {
    height: ROW_H,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  nameText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  subText: { fontSize: 11, color: '#666', marginTop: 1 },
  footer: { fontSize: 13, color: '#777', marginTop: 12 },
});
