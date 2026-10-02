import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, {
  Rect,
  Circle,
  Line,
  G,
  Defs,
  ClipPath,
  Text as SvgText,
} from 'react-native-svg';
import { loadActiveTasks, loadCompletedTasks } from '../storage/taskStorage';
import { getPriorityColor } from '../theme/priorityColors';

const WEEK_W = 84; // width of one week
const DAY_W = WEEK_W / 7; // width of one day
const ROW_H = 76; // height of one task row
const HEADER_H = 56; // month + week header
const LEFT_W = 112; // task name column
const BAR_Y = 12;
const BAR_H = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

const GREY = '#d0d0d0';
const GREY_DARK = '#888';
const GREEN = '#2ecc71';
const ORANGE = '#f39c12';

type Status = 'pending' | 'ontime' | 'late';
type Milestone = { id: string; title: string; date: Date; completedAt: Date | null };
type Row = {
  id: string;
  title: string;
  priority: string;
  start: Date;
  end: Date;
  completedAt: Date | null;
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

// Not done yet / done on time or early / done after the due date
const statusOf = (due: Date, completedAt: Date | null): Status => {
  if (!completedAt) return 'pending';
  return midnight(completedAt) > midnight(due) ? 'late' : 'ontime';
};

export default function GanttScreen() {
  const [chart, setChart] = useState<Chart | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const didScroll = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const active = await loadActiveTasks();
        const completed = await loadCompletedTasks();
        const completedById = new Map<string, any>(
          completed.map((t: any) => [t.id, t])
        );
        const everything = [...active, ...completed];
        const today = midnight(new Date());
        const cutoff = new Date(today.getTime() - 30 * DAY_MS);

        // Main tasks: everything open, plus anything finished in the last 30 days
        const activeMains = active.filter((t: any) => !t.parentId);
        const recentDone = completed.filter(
          (t: any) => !t.parentId && t.completedAt && new Date(t.completedAt) >= cutoff
        );
        const withDates = [...activeMains, ...recentDone].filter((t: any) => t.dueDate);

        const rows: Row[] = withDates.map((t: any) => {
          const end = midnight(new Date(t.dueDate));
          let start = t.createdAt ? midnight(new Date(t.createdAt)) : today;
          if (start > end) start = end;

          const milestones: Milestone[] = everything
            .filter((m: any) => m.parentId === t.id && m.dueDate)
            .map((m: any) => {
              const done = completedById.get(m.id);
              return {
                id: m.id,
                title: m.title,
                date: midnight(new Date(m.dueDate)),
                completedAt: done?.completedAt ? new Date(done.completedAt) : null,
              };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            start,
            end,
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            milestones,
            done: milestones.filter((m) => m.completedAt).length,
            total: milestones.length,
          };
        });

        // Work out the date range to draw
        let min = today;
        let max = today;
        const take = (d: Date | null) => {
          if (!d) return;
          if (d < min) min = d;
          if (d > max) max = d;
        };
        rows.forEach((r) => {
          take(r.start);
          take(r.end);
          take(r.completedAt);
          r.milestones.forEach((m) => {
            take(m.date);
            take(m.completedAt);
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
          hiddenCount: activeMains.filter((t: any) => !t.dueDate).length,
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

  // Split a task's bar into sections: one for each milestone, plus the
  // final stretch up to the due date (which belongs to the main task itself)
  const buildSections = (r: Row) => {
    const secs: { from: number; to: number; status: Status; endIdx: number }[] = [];
    let from = dayIdx(r.start);

    r.milestones.forEach((m) => {
      const to = dayIdx(m.date);
      const status = statusOf(m.date, m.completedAt);
      const doneIdx = m.completedAt ? dayIdx(m.completedAt) : to;
      secs.push({ from, to, status, endIdx: status === 'late' ? Math.max(to, doneIdx) : to });
      from = Math.max(from, to + 1);
    });

    const dueIdx = dayIdx(r.end);
    if (r.milestones.length === 0 || dueIdx >= from) {
      const status = statusOf(r.end, r.completedAt);
      const doneIdx = r.completedAt ? dayIdx(r.completedAt) : dueIdx;
      secs.push({
        from,
        to: dueIdx,
        status,
        endIdx: status === 'late' ? Math.max(dueIdx, doneIdx) : dueIdx,
      });
    }
    return secs;
  };

  const colorFor = (s: Status) => (s === 'late' ? ORANGE : s === 'ontime' ? GREEN : GREY);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Timeline</Text>

      {/* Key */}
      <View style={styles.key}>
        {[
          { color: GREY, label: 'Planned' },
          { color: GREEN, label: 'Done on time / early' },
          { color: ORANGE, label: 'Done late' },
        ].map((k) => (
          <View key={k.label} style={styles.keyItem}>
            <View style={[styles.keySwatch, { backgroundColor: k.color }]} />
            <Text style={styles.keyText}>{k.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.keyNote}>
        Each column is one week.   ○ milestone to do   ● milestone done
      </Text>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row' }}>
          {/* Task names (fixed on the left) */}
          <View style={{ width: LEFT_W }}>
            <View style={{ height: HEADER_H }} />
            {rows.map((r) => {
              const status = statusOf(r.end, r.completedAt);
              return (
                <View key={r.id} style={styles.nameCell}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={[styles.dot, { backgroundColor: getPriorityColor(r.priority) }]}
                    />
                    <Text style={[styles.nameText, { flex: 1 }]} numberOfLines={2}>
                      {r.title}
                    </Text>
                  </View>
                  {r.total > 0 && (
                    <Text style={styles.subText}>
                      {r.done}/{r.total} milestones
                    </Text>
                  )}
                  {r.completedAt ? (
                    <Text
                      style={[
                        styles.subText,
                        { color: status === 'late' ? ORANGE : '#27ae60', fontWeight: 'bold' },
                      ]}
                    >
                      ✓ Done {shortDate(r.completedAt)}
                      {status === 'late' ? ' (late)' : ''}
                    </Text>
                  ) : (
                    <Text style={styles.subText}>Due {shortDate(r.end)}</Text>
                  )}
                </View>
              );
            })}
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
                const barY = HEADER_H + i * ROW_H + BAR_Y;
                const secs = buildSections(r);
                const startIdx = dayIdx(r.start);
                const barEndIdx = Math.max(dayIdx(r.end), ...secs.map((s) => s.endIdx));
                const barX = startIdx * DAY_W;
                const barW = Math.max((barEndIdx + 1 - startIdx) * DAY_W, 14);
                const clipId = `clip-${r.id}`;

                // Draw on-time sections first so a late (orange) stretch shows on top
                const coloured = secs
                  .filter((s) => s.status !== 'pending')
                  .sort((a, b) => (a.status === b.status ? 0 : a.status === 'ontime' ? -1 : 1));

                return (
                  <React.Fragment key={r.id}>
                    <Defs>
                      <ClipPath id={clipId}>
                        <Rect x={barX} y={barY} width={barW} height={BAR_H} rx={8} />
                      </ClipPath>
                    </Defs>

                    {/* Grey bar, then coloured sections on top of it */}
                    <Rect x={barX} y={barY} width={barW} height={BAR_H} rx={8} fill={GREY} />
                    <G clipPath={`url(#${clipId})`}>
                      {coloured.map((s, si) => {
                        const x0 = s.from * DAY_W;
                        const w = (s.endIdx + 1 - s.from) * DAY_W;
                        if (w <= 0) return null;
                        return (
                          <Rect
                            key={si}
                            x={x0}
                            y={barY}
                            width={w}
                            height={BAR_H}
                            fill={colorFor(s.status)}
                          />
                        );
                      })}
                    </G>

                    {/* Milestones */}
                    {r.milestones.map((m, mi) => {
                      const st = statusOf(m.date, m.completedAt);
                      const cx = xOf(m.date) + DAY_W / 2;
                      return (
                        <React.Fragment key={m.id}>
                          <Circle
                            cx={cx}
                            cy={barY + BAR_H / 2}
                            r={8}
                            fill={st === 'pending' ? '#fff' : colorFor(st)}
                            stroke={st === 'pending' ? GREY_DARK : '#fff'}
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
      <Text style={styles.footer}>Tasks completed in the last 30 days stay on the timeline.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 16 },
  empty: { fontSize: 16, color: '#777' },
  key: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  keyItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, paddingVertical: 3 },
  keySwatch: { width: 14, height: 14, borderRadius: 4, marginRight: 6 },
  keyText: { fontSize: 12, color: '#000' },
  keyNote: { fontSize: 12, color: '#555', marginBottom: 10 },
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
  dot: { width: 10, height: 10, borderRadius: 3, marginRight: 6 },
  nameText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  subText: { fontSize: 11, color: '#666', marginTop: 1 },
  footer: { fontSize: 13, color: '#777', marginTop: 12 },
});
