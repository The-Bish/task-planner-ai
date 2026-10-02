import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  loadActiveTasks,
  saveActiveTasks,
  saveCompletedTasks,
  loadCompletedTasks,
} from '../storage/taskStorage';
import { MaterialIcons, Feather } from '@expo/vector-icons';

import ProgressRing from '../components/ProgressRing';
import WeeklyBarChart from '../components/WeeklyBarChart';
import PriorityLegend from '../components/PriorityLegend';
import {
  getPriorityColor,
  getPriorityTint,
  getPriorityLabel,
} from '../theme/priorityColors';

function formatDate(dateString?: string | null) {
  if (!dateString) return 'No due date';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB');
}

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const nav = useNavigation();
  const route = useRoute();

  const newTask = (route as any).params?.newTask;

  const [tasks, setTasks] = useState<any[]>([]);

  const [completedToday, setCompletedToday] = useState(0);
  const [completedThisWeek, setCompletedThisWeek] = useState<string[][]>([[], [], [], [], [], [], []]);
  const [streak, setStreak] = useState(0);
  const [completedTodayTasks, setCompletedTodayTasks] = useState<any[]>([]);
  const [milestoneStats, setMilestoneStats] = useState<
    Record<string, { done: number; total: number }>
  >({});
  const [parentTitles, setParentTitles] = useState<Record<string, string>>({});
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [nextDeadline, setNextDeadline] = useState<string | null>(null);

  const recalcDashboard = async () => {
    let active = await loadActiveTasks();
    let completed = await loadCompletedTasks();

    // Tidy up any duplicates left over from earlier: a task should only
    // appear once, and never in both the active and completed lists.
    const seenIds = new Set<string>();
    const dedupedCompleted = completed.filter((t: any) => {
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    });
    if (dedupedCompleted.length !== completed.length) {
      completed = dedupedCompleted;
      await saveCompletedTasks(completed);
    }
    const cleanActive = active.filter((t: any) => !seenIds.has(t.id));
    if (cleanActive.length !== active.length) {
      active = cleanActive;
      await saveActiveTasks(active);
    }

    // If a newTask was passed in, add it to active and save
    if (newTask) {
      const exists =
        active.some((t: any) => t.id === newTask.id) ||
        completed.some((t: any) => t.id === newTask.id);
      if (!exists) {
        active = [...active, newTask];
        await saveActiveTasks(active);
      }
      // Clear it so it can never be added a second time
      nav.setParams({ newTask: undefined } as never);
    }

    // Active tasks
    setTasks(active);

    // Milestone counters (done / total) for each main task, plus a lookup of
    // task titles so a milestone can say which task it belongs to
    const stats: Record<string, { done: number; total: number }> = {};
    const titles: Record<string, string> = {};
    active.forEach((t: any) => {
      titles[t.id] = t.title;
      if (t.parentId) {
        stats[t.parentId] = stats[t.parentId] || { done: 0, total: 0 };
        stats[t.parentId].total += 1;
      }
    });
    completed.forEach((t: any) => {
      titles[t.id] = t.title;
      if (t.parentId) {
        stats[t.parentId] = stats[t.parentId] || { done: 0, total: 0 };
        stats[t.parentId].total += 1;
        stats[t.parentId].done += 1;
      }
    });
    setMilestoneStats(stats);
    setParentTitles(titles);

    // Completed today
    const today = new Date().toDateString();
    const doneToday = completed
      .filter(
        (t) =>
          t.completedAt &&
          !t.hasMilestones &&
          new Date(t.completedAt).toDateString() === today
      )
      .sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      );
    setCompletedTodayTasks(doneToday);
    setCompletedToday(doneToday.length);

    // Weekly data (Sun–Sat)
    // Each day holds the priority colours of the tasks finished that day,
    // oldest first, so the bar stacks up in the order they were completed.
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const weekData: string[][] = [[], [], [], [], [], [], []];
    [...completed]
      .filter((t) => t.completedAt && !t.hasMilestones)
      .sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      )
      .forEach((t) => {
        const d = new Date(t.completedAt);
        if (d >= startOfWeek && d < endOfWeek) {
          weekData[d.getDay()].push(getPriorityColor(t.priority)); // 0=Sun ... 6=Sat
        }
      });
    setCompletedThisWeek(weekData);

    // Streak
    let streakCount = 0;
    for (let i = 0; i < 7; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const count = completed.filter(
        (t) =>
          t.completedAt &&
          new Date(t.completedAt).toDateString() === day.toDateString()
      ).length;
      if (count > 0) streakCount++;
      else break;
    }
    setStreak(streakCount);

    // Overdue tasks
    setOverdueTasks(
      active.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date()
      ).length
    );

    // Next deadline
    const futureTasks = active.filter(
      (t) => t.dueDate && new Date(t.dueDate) >= new Date()
    );
    if (futureTasks.length > 0) {
      const soonest = [...futureTasks].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )[0];
      setNextDeadline(new Date(soonest.dueDate).toLocaleDateString('en-GB'));
    } else {
      setNextDeadline(null);
    }
  };

  useEffect(() => {
    recalcDashboard();
  }, [newTask]);

  useEffect(() => {
    const unsubscribe = nav.addListener('focus', () => {
      recalcDashboard();
    });
    return unsubscribe;
  }, [nav, newTask]);

  const toggleCompleted = async (taskId: string) => {
    const active = await loadActiveTasks();
    const completed = await loadCompletedTasks();

    const task = active.find((t) => t.id === taskId);
    if (!task) return;

    Alert.alert('Congratulations! 🎉', 'You’ve completed a task!', [{ text: 'Nice!' }]);

    const updatedActive = active.filter((t) => t.id !== taskId);
    const updatedCompleted = [
      ...completed,
      {
        ...task,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    ];

    await saveActiveTasks(updatedActive);
    await saveCompletedTasks(updatedCompleted);

    // Reload everything from storage so UI matches reality
    await recalcDashboard();
  };

  const deleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task?',
      "Are you sure you want to delete this?\n\n• Yes, it's not necessary\n• No, actually this is important",
      [
        {
          text: 'No, actually this is important',
          style: 'cancel',
        },
        {
          text: "Yes, it's not necessary",
          style: 'destructive',
          onPress: async () => {
            const active = await loadActiveTasks();
            // Deleting a main task also removes its milestones
            const updated = active.filter(
              (t) => t.id !== taskId && t.parentId !== taskId
            );
            await saveActiveTasks(updated);
            await recalcDashboard();
          },
        },
      ]
    );
  };

  // One ring segment per task for today: completed ones in their priority
  // colour (in the order they were finished), open ones left grey.
  const ringSegments: (string | null)[] = [
    ...completedTodayTasks.map((t) => getPriorityColor(t.priority)),
    ...tasks.filter((t) => !t.hasMilestones).map(() => null),
  ];

  // Show each main task followed by its milestones
  const topLevel = tasks.filter(
    (t) => !(t.parentId && tasks.some((p) => p.id === t.parentId))
  );
  const orderedTasks = topLevel.flatMap((t) => [
    t,
    ...tasks
      .filter((m) => m.parentId === t.id)
      .sort(
        (a, b) =>
          new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
      ),
  ]);

  return (
    <ScrollView style={{ padding: 16 }}>
      {/* Dashboard */}
      <View
        style={{
          padding: 16,
          backgroundColor: '#f0f0f0',
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
          Dashboard
        </Text>

        <PriorityLegend />

        <Text style={{ fontSize: 16, marginBottom: 10 }}>Daily Progress</Text>
        <ProgressRing segments={ringSegments} done={completedToday} />

        <WeeklyBarChart data={completedThisWeek} />

        <Text style={{ fontSize: 16, marginTop: 10 }}>
          🔥 Streak: {streak} day{streak !== 1 ? 's' : ''}
        </Text>

        <Text style={{ fontSize: 16, marginTop: 10 }}>
          ⏳ Overdue Tasks: {overdueTasks}
        </Text>

        <Text style={{ fontSize: 16, marginTop: 10 }}>
          📅 Next Deadline: {nextDeadline || 'None'}
        </Text>

        <Text
          style={{
            marginTop: 14,
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {ringSegments.length === 0
            ? 'Add a task to get started!'
            : completedToday === 0
            ? 'Let’s get something done today!'
            : completedToday < ringSegments.length
            ? 'Great start — keep going!'
            : 'Amazing! You cleared everything!'}
        </Text>
      </View>

      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Active Tasks
      </Text>

      {tasks.length === 0 && (
        <Text style={{ fontSize: 16, marginTop: 10, color: 'grey' }}>
          You currently have no active tasks.
        </Text>
      )}

      {orderedTasks.map((task) => {
        const isChild =
          !!task.parentId && tasks.some((p) => p.id === task.parentId);
        const stats = milestoneStats[task.id];
        return (
        <View
          key={task.id}
          style={{
            marginLeft: isChild ? 24 : 0,
            padding: 12,
            borderWidth: 2,
            borderColor: getPriorityColor(task.priority),
            borderRadius: 8,
            marginTop: 20,
            marginBottom: 10,
            backgroundColor: getPriorityTint(task.priority),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => toggleCompleted(task.id)}>
              <MaterialIcons
                name="radio-button-unchecked"
                size={28}
                color="grey"
              />
            </TouchableOpacity>

            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 18,
                marginLeft: 10,
              }}
            >
              {task.title}
            </Text>
          </View>

          {task.description !== task.title && (
            <Text style={{ marginTop: 4 }}>{task.description}</Text>
          )}

          <Text style={{ marginTop: 8 }}>Priority: {getPriorityLabel(task.priority)}</Text>

          {task.category && (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
            >
              <MaterialIcons
                name={task.category === 'work' ? 'business' : 'home'}
                size={18}
                color="#555"
              />
              <Text style={{ marginLeft: 6 }}>
                {task.category === 'work' ? 'Work' : 'Personal'}
              </Text>
            </View>
          )}

          <Text style={{ marginTop: 4 }}>Due: {formatDate(task.dueDate)}</Text>

          {task.parentId && (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
            >
              <MaterialIcons name="flag" size={18} color="#555" />
              <Text style={{ marginLeft: 6, flexShrink: 1 }}>
                Milestone of {parentTitles[task.parentId] ?? 'another task'}
              </Text>
            </View>
          )}

          {!task.parentId && stats && stats.total > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>
                Milestones: {stats.done}/{stats.total}
              </Text>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#00000018',
                  marginTop: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${(stats.done / stats.total) * 100}%`,
                    backgroundColor: getPriorityColor(task.priority),
                  }}
                />
              </View>
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              marginTop: 10,
              justifyContent: 'space-between',
            }}
          >
            <Button
              title="Edit"
              onPress={() => nav.navigate('EditTask' as never, { task } as never)}
            />

            <TouchableOpacity onPress={() => deleteTask(task.id)}>
              <Feather name="trash-2" size={28} color="red" />
            </TouchableOpacity>
          </View>
        </View>
        );
      })}
    </ScrollView>
  );
}

