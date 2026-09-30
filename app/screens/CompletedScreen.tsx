import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button } from 'react-native';
import {
  loadCompletedTasks,
  saveCompletedTasks,
  loadActiveTasks,
  saveActiveTasks,
} from '../storage/taskStorage';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

function formatDate(dateString?: string | null) {
  if (!dateString) return 'No date';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB');
}

export default function CompletedScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const navigation = useNavigation();

  const loadCompleted = async () => {
    const completed = await loadCompletedTasks();
    setTasks(completed);
  };

  useEffect(() => {
    loadCompleted();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCompleted();
    });
    return unsubscribe;
  }, [navigation]);

  const undoCompletion = async (taskId: string) => {
    const completed = await loadCompletedTasks();
    const active = await loadActiveTasks();

    const task = completed.find((t) => t.id === taskId);
    if (!task) return;

    const updatedCompleted = completed.filter((t) => t.id !== taskId);
    const updatedActive = [
      ...active,
      {
        ...task,
        completed: false,
        completedAt: null,
      },
    ];

    await saveCompletedTasks(updatedCompleted);
    await saveActiveTasks(updatedActive);

    // Reload completed list for this screen
    const freshCompleted = await loadCompletedTasks();
    setTasks(freshCompleted);

    // Go back to Home; Home will reload on focus
    navigation.navigate('Home' as never);
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Completed Tasks
      </Text>

      {tasks.length === 0 && (
        <Text style={{ fontSize: 16, marginTop: 20 }}>No completed tasks yet.</Text>
      )}

      {tasks.map((task) => (
        <View
          key={task.id}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 8,
            marginTop: 20,
            marginBottom: 10,
            backgroundColor: '#f7f7f7',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="check-circle" size={28} color="green" />
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginLeft: 10 }}>
              {task.title}
            </Text>
          </View>

          {task.description !== task.title && (
            <Text style={{ marginTop: 4 }}>{task.description}</Text>
          )}

          <Text style={{ marginTop: 8 }}>
            Completed: {formatDate(task.completedAt)}
          </Text>
		
	  <Text style={{ marginTop: 4 }}>
  	    Original Due Date: {formatDate(task.dueDate)}
	  </Text>


          <View style={{ marginTop: 10 }}>
            <Button title="Undo Completion" onPress={() => undoCompletion(task.id)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}



