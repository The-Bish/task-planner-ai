import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

function formatDate(date: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB');
}

export default function AddTaskScreen() {
  const nav = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('not-urgent-important');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const saveTask = () => {
    const newTask = {
      id: Math.random().toString(36).slice(2, 9),
      title,
      description,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : null,
      completed: false,
    };

    nav.navigate('Home', { newTask, refresh: Date.now() });
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 20 }}>
        Add New Task
      </Text>

      <Text style={{ marginBottom: 6 }}>Title</Text>
      <TextInput
        placeholder="Task title"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 8, marginBottom: 20 }}
      />

      <Text style={{ marginBottom: 6 }}>Description</Text>
      <TextInput
        placeholder="Task description"
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
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setDueDate(selectedDate);
          }}
        />
      )}

      <View style={{ marginTop: 30 }}>
        <Button title="Save Task" onPress={saveTask} />
      </View>
    </View>
  );
}

