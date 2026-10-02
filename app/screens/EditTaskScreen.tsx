import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  loadActiveTasks,
  saveActiveTasks,
  loadCompletedTasks,
} from '../storage/taskStorage';
import {
  priorityColors,
  priorityLabels,
  getPriorityColor,
  getPriorityTint,
} from '../theme/priorityColors';

type Category = 'work' | 'personal';

const categories: { value: Category; label: string; icon: 'business' | 'home' }[] = [
  { value: 'work', label: 'Work', icon: 'business' },
  { value: 'personal', label: 'Personal', icon: 'home' },
];

type NewMilestone = { id: string; title: string; date: Date | null };
type ExistingMilestone = { id: string; title: string; dueDate: string | null; done: boolean };

const formatDate = (date: Date | null) => (date ? date.toLocaleDateString('en-GB') : '');

const newId = (extra = '') =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + extra;

export default function EditTaskScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const task = (route.params as any)?.task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('not-urgent-important');
  const [category, setCategory] = useState<Category>('work');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [existing, setExisting] = useState<ExistingMilestone[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [added, setAdded] = useState<NewMilestone[]>([]);
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState<Date | null>(null);
  const [showMPicker, setShowMPicker] = useState(false);

  // Fill the form every time a different task is opened
  useEffect(() => {
    if (!task) return;
    setTitle(task.title ?? '');
    setDescription(task.description === task.title ? '' : task.description ?? '');
    setPriority(task.priority ?? 'not-urgent-important');
    setCategory(task.category === 'personal' ? 'personal' : 'work');
    setDueDate(task.dueDate ? new Date(task.dueDate) : null);
    setRemovedIds([]);
    setAdded([]);
    setMTitle('');
    setMDate(null);

    const loadMilestones = async () => {
      const active = await loadActiveTasks();
      const completed = await loadCompletedTasks();
      const list: ExistingMilestone[] = [
        ...active
          .filter((t: any) => t.parentId === task.id)
          .map((t: any) => ({ id: t.id, title: t.title, dueDate: t.dueDate, done: false })),
        ...completed
          .filter((t: any) => t.parentId === task.id)
          .map((t: any) => ({ id: t.id, title: t.title, dueDate: t.dueDate, done: true })),
      ].sort(
        (a, b) =>
          new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
      );
      setExisting(list);
    };
    loadMilestones();
  }, [task]);

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={{ padding: 16 }}>Choose a task to edit from the Home screen.</Text>
      </View>
    );
  }

  const isMilestone = !!task.parentId;
  const visibleExisting = existing.filter((m) => !removedIds.includes(m.id));

  const addMilestone = () => {
    if (!mTitle.trim()) return;
    if (!dueDate) {
      Alert.alert(
        'Add a due date first',
        'Pick a due date so the milestones can be placed on the timeline.'
      );
      return;
    }
    setAdded((prev) => [...prev, { id: newId(), title: mTitle.trim(), date: mDate }]);
    setMTitle('');
    setMDate(null);
  };

  const saveEdits = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please give your task a title first.');
      return;
    }

    const now = new Date();
    const startMs = now.getTime();
    const endMs = dueDate ? dueDate.getTime() : startMs;
    const cleanTitle = title.trim();

    const newKids = added.map((m, i) => {
      const date =
        m.date ?? new Date(startMs + ((endMs - startMs) * (i + 1)) / added.length);
      return {
        id: newId(String(i)),
        title: m.title,
        description: m.title,
        priority,
        category,
        dueDate: date.toISOString(),
        completed: false,
        createdAt: now.toISOString(),
        parentId: task.id,
        isMilestone: true,
      };
    });

    const hasMilestones = visibleExisting.length + newKids.length > 0;

    const active = await loadActiveTasks();
    const updated = active
      .filter((t: any) => !removedIds.includes(t.id))
      .map((t: any) => {
        if (t.id === task.id) {
          return {
            ...t,
            title: cleanTitle,
            description: description.trim() || cleanTitle,
            priority,
            category,
            dueDate: dueDate ? dueDate.toISOString() : null,
            hasMilestones: isMilestone ? t.hasMilestones : hasMilestones,
          };
        }
        // Keep milestones in step with their main task's colour and type
        if (t.parentId === task.id) return { ...t, priority, category };
        return t;
      });

    await saveActiveTasks([...updated, ...newKids]);
    nav.navigate('Home' as never);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Edit Task</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What needs doing?"
          placeholderTextColor="#999"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add some detail (optional)"
          placeholderTextColor="#999"
          multiline
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.categoryRow}>
          {categories.map((c) => {
            const selected = category === c.value;
            return (
              <TouchableOpacity
                key={c.value}
                style={[styles.categoryButton, selected && styles.categoryButtonSelected]}
                onPress={() => setCategory(c.value)}
              >
                <MaterialIcons name={c.icon} size={28} color={selected ? '#3498db' : '#777'} />
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Priority</Text>
        {Object.keys(priorityColors).map((key) => {
          const selected = priority === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.priorityRow,
                selected && {
                  borderColor: getPriorityColor(key),
                  backgroundColor: getPriorityTint(key),
                },
              ]}
              onPress={() => setPriority(key)}
            >
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(key) }]} />
              <Text style={[styles.priorityText, selected && { fontWeight: 'bold' }]}>
                {priorityLabels[key]}
              </Text>
              {selected && <MaterialIcons name="check" size={20} color={getPriorityColor(key)} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Due Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
            <MaterialIcons name="event" size={22} color="#3498db" />
            <Text style={styles.dateText}>{dueDate ? formatDate(dueDate) : 'Pick a date'}</Text>
          </TouchableOpacity>
          {dueDate && (
            <TouchableOpacity onPress={() => setDueDate(null)}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {showPicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setDueDate(selectedDate);
            }}
          />
        )}
      </View>

      {/* Milestones (main tasks only) */}
      {!isMilestone && (
        <View style={styles.card}>
          <Text style={styles.label}>Milestones</Text>

          {visibleExisting.map((m) => (
            <View
              key={m.id}
              style={[
                styles.milestoneRow,
                {
                  borderColor: getPriorityColor(priority),
                  backgroundColor: getPriorityTint(priority),
                },
              ]}
            >
              <MaterialIcons
                name={m.done ? 'check-circle' : 'flag'}
                size={20}
                color={m.done ? '#2ecc71' : '#555'}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{m.title}</Text>
                {m.dueDate && (
                  <Text style={{ color: '#555' }}>
                    {new Date(m.dueDate).toLocaleDateString('en-GB')}
                    {m.done ? ' · done' : ''}
                  </Text>
                )}
              </View>
              {!m.done && (
                <TouchableOpacity onPress={() => setRemovedIds((p) => [...p, m.id])}>
                  <MaterialIcons name="close" size={22} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {added.map((m) => (
            <View
              key={m.id}
              style={[
                styles.milestoneRow,
                {
                  borderColor: getPriorityColor(priority),
                  backgroundColor: getPriorityTint(priority),
                },
              ]}
            >
              <MaterialIcons name="flag" size={20} color="#555" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{m.title}</Text>
                <Text style={{ color: '#555' }}>
                  {m.date ? formatDate(m.date) : 'Date set automatically'} · new
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAdded((p) => p.filter((x) => x.id !== m.id))}>
                <MaterialIcons name="close" size={22} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.label, { marginTop: 12 }]}>Add a milestone</Text>
          <TextInput
            placeholder="e.g. Order the materials"
            placeholderTextColor="#999"
            value={mTitle}
            onChangeText={setMTitle}
            style={styles.input}
          />

          <View style={[styles.dateRow, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowMPicker(true)}>
              <MaterialIcons name="event" size={22} color="#3498db" />
              <Text style={styles.dateText}>{mDate ? formatDate(mDate) : 'Date (optional)'}</Text>
            </TouchableOpacity>
            {mDate && (
              <TouchableOpacity onPress={() => setMDate(null)}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {showMPicker && (
            <DateTimePicker
              value={mDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowMPicker(false);
                if (selectedDate) setMDate(selectedDate);
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.addMilestoneButton, !mTitle.trim() && { opacity: 0.4 }]}
            onPress={addMilestone}
            disabled={!mTitle.trim()}
          >
            <MaterialIcons name="add" size={22} color="#fff" />
            <Text style={styles.addMilestoneText}>Add milestone</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            No date? We'll spread new ones evenly up to the due date.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={saveEdits}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  categoryRow: { flexDirection: 'row', gap: 12 },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryButtonSelected: { borderColor: '#3498db', backgroundColor: '#3498db1A' },
  categoryText: { marginTop: 4, fontSize: 15, color: '#555' },
  categoryTextSelected: { color: '#3498db', fontWeight: 'bold' },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  priorityDot: { width: 14, height: 14, borderRadius: 4, marginRight: 10 },
  priorityText: { flex: 1, fontSize: 15, color: '#000' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  dateText: { marginLeft: 8, fontSize: 16, color: '#000' },
  clearText: { color: '#e74c3c', fontSize: 15 },
  hint: { fontSize: 12, color: '#777', marginTop: 8 },
  addMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  addMilestoneText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
