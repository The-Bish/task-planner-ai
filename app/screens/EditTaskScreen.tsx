import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { loadTasks, saveTasks } from '../storage/taskStorage';

function formatDate(date: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB');
}

export default function EditTaskScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const task = (route.params as any).task;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate) : null);
  const [showPicker, setShowPicker] = useState(false);

  const saveEdits = async () => {
    const updatedTask = {
      ...task,
      title,
      description,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : null,
    };

    const tasks = await loadTasks();
    const newList = tasks.map((t) => (t.id === task.id ? updatedTask : t));

    await saveTasks(newList);

    nav.navigate('Home', { refresh: Date.now() });
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 20 }}>
        Edit Task
      </Text>

      <Text style={{ marginBottom: 6 }}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 8, marginBottom: 20 }}
      />

      <Text style={{ marginBottom: 6 }}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={{ borderWidth: 1, padding: 8, marginBottom: 20 }}
      />

      <Text style={{ marginBottom: 6 }}>Priority</Text>
      <Picker
        selectedValue={priority}
        onValueChange={(v) => setPriority(v)}
        style={{ borderWidth: 1, marginBottom: 20 }}
      >
        <Picker.Item label="Urgent & Important" value="urgent-important" />
        <Picker.Item label="Urgent & Not Important" value="urgent-not-important" />
        <Picker.Item label="Not Urgent & Important" value="not-urgent-important" />
        <Picker.Item label="Not Urgent & Not Important" value="not-urgent-not-important" />
      </Picker>

      <Text style={{ marginBottom: 6 }}>Due Date</Text>

      {dueDate ? (
        <Text style={{ marginBottom: 10 }}>
          Selected: {formatDate(dueDate)}
        </Text>
      ) : (
        <Text style={{ marginBottom: 10 }}>No date selected</Text>
      )}

      <Button title="Pick a date" onPress={() => setShowPicker(true)} />

      {showPicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onValueChange={(selectedDate) => {
            if (selectedDate) setDueDate(selectedDate);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}

      <View style={{ marginTop: 30 }}>
        <Button title="Save Changes" onPress={saveEdits} />
      </View>
    </View>
  );
}

