import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { loadActiveTasks, saveActiveTasks } from '../storage/taskStorage';
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

function formatDate(date: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB');
}

type MilestoneDraft = { id: string; title: string; date: Date | null };

const newId = (extra = '') =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + extra;

export default function AddTaskScreen() {
  const nav = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('not-urgent-important');
  const [category, setCategory] = useState<Category>('work');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Milestones
  const [showMilestones, setShowMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState<Date | null>(null);
  const [showMPicker, setShowMPicker] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('not-urgent-important');
    setCategory('work');
    setDueDate(null);
    setMilestones([]);
    setMTitle('');
    setMDate(null);
  };

  // Builds the main task (and its milestones, if any), saves them, and goes Home
  const commitTasks = async (list: MilestoneDraft[]) => {
    const now = new Date();
    const parentId = newId();
    const cleanTitle = title.trim();

    const parent = {
      id: parentId,
      title: cleanTitle,
      description: description.trim() || cleanTitle,
      priority,
      category,
      dueDate: dueDate ? dueDate.toISOString() : null,
      completed: false,
      createdAt: now.toISOString(),
      hasMilestones: list.length > 0,
    };

    // Milestones without a date are spread evenly between now and the due date
    const startMs = now.getTime();
    const endMs = dueDate ? dueDate.getTime() : startMs;
    const children = list.map((m, i) => {
      const date =
        m.date ?? new Date(startMs + ((endMs - startMs) * (i + 1)) / list.length);
      return {
        id: newId(String(i)),
        title: m.title,
        description: m.title,
        priority,
        category,
        dueDate: date.toISOString(),
        completed: false,
        createdAt: now.toISOString(),
        parentId,
        isMilestone: true,
      };
    });

    const active = await loadActiveTasks();
    await saveActiveTasks([...active, parent, ...children]);

    setShowMilestones(false);
    resetForm();
    nav.navigate('Home' as never);
  };

  const saveTask = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please give your task a title first.');
      return;
    }

    Alert.alert(
      'Break it down?',
      `Would you like to split "${title.trim()}" into smaller milestones?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'No, just add it', onPress: () => commitTasks([]) },
        {
          text: 'Yes, add milestones',
          onPress: () => {
            if (!dueDate) {
              Alert.alert(
                'Add a due date first',
                'Pick a due date so the milestones can be placed on the timeline.'
              );
              return;
            }
            setShowMilestones(true);
          },
        },
      ]
    );
  };

  const addMilestone = () => {
    if (!mTitle.trim()) return;
    setMilestones((prev) => [
      ...prev,
      { id: newId(), title: mTitle.trim(), date: mDate },
    ]);
    setMTitle('');
    setMDate(null);
  };

  const removeMilestone = (id: string) =>
    setMilestones((prev) => prev.filter((m) => m.id !== id));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Add New Task</Text>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          placeholder="What needs doing?"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
        <TextInput
          placeholder="Add some detail (optional)"
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
        />
      </View>

      {/* Work / Personal */}
      <View style={styles.card}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.categoryRow}>
          {categories.map((c) => {
            const selected = category === c.value;
            return (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.categoryButton,
                  selected && styles.categoryButtonSelected,
                ]}
                onPress={() => setCategory(c.value)}
              >
                <MaterialIcons
                  name={c.icon}
                  size={28}
                  color={selected ? '#3498db' : '#777'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selected && styles.categoryTextSelected,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Priority */}
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
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(key) },
                ]}
              />
              <Text
                style={[
                  styles.priorityText,
                  selected && { fontWeight: 'bold' },
                ]}
              >
                {priorityLabels[key]}
              </Text>
              {selected && (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={getPriorityColor(key)}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Due date */}
      <View style={styles.card}>
        <Text style={styles.label}>Due Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <MaterialIcons name="event" size={22} color="#3498db" />
            <Text style={styles.dateText}>
              {dueDate ? formatDate(dueDate) : 'Pick a date'}
            </Text>
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

      <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
        <Text style={styles.saveButtonText}>Save Task</Text>
      </TouchableOpacity>

      {/* Milestones */}
      <Modal
        visible={showMilestones}
        animationType="slide"
        onRequestClose={() => setShowMilestones(false)}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Milestones</Text>
          <Text style={styles.subtitle}>
            Smaller steps towards finishing "{title.trim()}". Each one shows up
            as its own task.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>New milestone</Text>
            <TextInput
              placeholder="e.g. Write the first draft"
              placeholderTextColor="#999"
              value={mTitle}
              onChangeText={setMTitle}
              style={styles.input}
            />

            <View style={[styles.dateRow, { marginTop: 12 }]}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowMPicker(true)}
              >
                <MaterialIcons name="event" size={22} color="#3498db" />
                <Text style={styles.dateText}>
                  {mDate ? formatDate(mDate) : 'Date (optional)'}
                </Text>
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
              No date? We'll spread them evenly up to the due date.
            </Text>
          </View>

          {milestones.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>
                Your milestones ({milestones.length})
              </Text>
              {milestones.map((m, i) => (
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
                    <Text style={{ fontSize: 15, fontWeight: 'bold' }}>
                      {i + 1}. {m.title}
                    </Text>
                    {m.date && (
                      <Text style={{ color: '#555' }}>{formatDate(m.date)}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeMilestone(m.id)}>
                    <MaterialIcons name="close" size={22} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => commitTasks(milestones)}
          >
            <Text style={styles.saveButtonText}>
              {milestones.length > 0
                ? `Save task with ${milestones.length} milestone${
                    milestones.length !== 1 ? 's' : ''
                  }`
                : 'Save task'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowMilestones(false)}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
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
  categoryButtonSelected: {
    borderColor: '#3498db',
    backgroundColor: '#3498db1A',
  },
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
  subtitle: { fontSize: 15, color: '#555', marginBottom: 16, marginTop: -8 },
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
  backButton: { alignItems: 'center', paddingVertical: 16 },
  backText: { fontSize: 16, color: '#555' },
  saveButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
