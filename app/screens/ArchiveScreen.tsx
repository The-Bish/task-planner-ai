import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

import { loadCompletedTasks } from '../storage/taskStorage';

import PriorityGraph from '../components/analytics/PriorityGraph';
import CompletionGraph from '../components/analytics/CompletionGraph';

export default function ArchiveScreen() {
  const navigation = useNavigation();

  const [completed, setCompleted] = useState([]);

  const [range, setRange] = useState('today');
  const [filter, setFilter] = useState('none');

  const [pickerOpenRange, setPickerOpenRange] = useState(false);
  const [pickerOpenFilter, setPickerOpenFilter] = useState(false);

  const rotateAnimRange = useState(new Animated.Value(0))[0];
  const rotateAnimFilter = useState(new Animated.Value(0))[0];

  const toggleRange = () => {
    setPickerOpenRange(!pickerOpenRange);
    Animated.timing(rotateAnimRange, {
      toValue: pickerOpenRange ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const toggleFilter = () => {
    setPickerOpenFilter(!pickerOpenFilter);
    Animated.timing(rotateAnimFilter, {
      toValue: pickerOpenFilter ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const chevronRange = rotateAnimRange.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const chevronFilter = rotateAnimFilter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  useEffect(() => {
    const load = async () => {
      const tasks = await loadCompletedTasks();
      setCompleted(tasks || []);
    };
    load();
  }, []);

  const rangeLabel =
    range === 'today'
      ? 'Today'
      : range === 'week'
      ? 'This Week'
      : range === 'month'
      ? 'This Month'
      : 'Since Start';

  const filterLabel =
    filter === 'none'
      ? 'No Filter'
      : filter === 'priority'
      ? 'Priority'
      : 'Completion Status';

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 20 }}>
        Archive Analytics
      </Text>

      {/* RANGE PICKER */}
      <TouchableOpacity
        onPress={toggleRange}
        style={{
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 10,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{rangeLabel}</Text>

        <Animated.View style={{ transform: [{ rotate: chevronRange }] }}>
          <Text style={{ fontSize: 20 }}>⌄</Text>
        </Animated.View>
      </TouchableOpacity>

      {pickerOpenRange && (
        <Picker
          selectedValue={range}
          onValueChange={(v) => {
            setRange(v);
            setPickerOpenRange(false);
            rotateAnimRange.setValue(0);
          }}
          style={{
            backgroundColor: '#f0f0f0',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Picker.Item label="Today" value="today" />
          <Picker.Item label="This Week" value="week" />
          <Picker.Item label="This Month" value="month" />
          <Picker.Item label="Since Start" value="all" />
        </Picker>
      )}

      {/* FILTER PICKER */}
      <TouchableOpacity
        onPress={toggleFilter}
        style={{
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 10,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{filterLabel}</Text>

        <Animated.View style={{ transform: [{ rotate: chevronFilter }] }}>
          <Text style={{ fontSize: 20 }}>⌄</Text>
        </Animated.View>
      </TouchableOpacity>

      {pickerOpenFilter && (
        <Picker
          selectedValue={filter}
          onValueChange={(v) => {
            setFilter(v);
            setPickerOpenFilter(false);
            rotateAnimFilter.setValue(0);
          }}
          style={{
            backgroundColor: '#f0f0f0',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Picker.Item label="None" value="none" />
          <Picker.Item label="Priority" value="priority" />
          <Picker.Item label="Completion Status" value="completion" />
        </Picker>
      )}

      {/* GRAPHS */}
      {filter === 'priority' && (
        <PriorityGraph tasks={completed} />
      )}

      {filter === 'completion' && (
        <CompletionGraph
          analytics={{
            early: completed.filter(t => new Date(t.completedAt) < new Date(t.dueDate)).length,
            onTime: completed.filter(t => new Date(t.completedAt).toDateString() === new Date(t.dueDate).toDateString()).length,
            late: completed.filter(t => new Date(t.completedAt) > new Date(t.dueDate)).length,
          }}
        />
      )}
    </ScrollView>
  );
}

