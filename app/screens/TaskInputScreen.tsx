import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

export default function TaskInputScreen() {
  const nav = useNavigation();
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('not-urgent-important');

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>New Task</Text>

      <TextInput
        placeholder="Describe your task"
        value={text}
        onChangeText={setText}
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

      <Button
        title="Analyze with AI"
        onPress={() =>
          nav.navigate('AiProcessing' as never, {
            rawText: text,
            priority,
          } as never)
        }
      />
    </View>
  );
}
