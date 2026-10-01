import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
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

export default function AddTaskScreen() {
  const nav = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('not-urgent-important');
  const [category, setCategory] = useState<Category>('work');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const saveTask = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please give your task a title first.');
      return;
    }

    const newTask = {
      id: Math.random().toString(36).slice(2, 9),
      title: title.trim(),
      description: description.trim() || title.trim(),
      priority,
      category,
      dueDate: dueDate ? dueDate.toISOString() : null,
      completed: false,
    };

    nav.navigate('Home' as never, { newTask, refresh: Date.now() } as never);

    // Clear the form ready for the next task
    setTitle('');
    setDescription('');
    setPriority('not-urgent-important');
    setCategory('work');
    setDueDate(null);
  };

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
  saveButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
