import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import EditTaskScreen from '../screens/EditTaskScreen';
import GanttScreen from '../screens/GanttScreen';
import CompletedScreen from '../screens/CompletedScreen';
import ArchiveScreen from '../screens/ArchiveScreen';

const Tab = createBottomTabNavigator();

const icon =
  (name: React.ComponentProps<typeof MaterialIcons>['name']) =>
  ({ color, size }: { color: string; size: number }) =>
    <MaterialIcons name={name} size={size} color={color} />;

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: icon('home') }} />
      <Tab.Screen name="Add Task" component={AddTaskScreen} options={{ tabBarIcon: icon('add-circle') }} />
      <Tab.Screen name="Timeline" component={GanttScreen} options={{ tabBarIcon: icon('timeline') }} />
      <Tab.Screen name="Completed" component={CompletedScreen} options={{ tabBarIcon: icon('check-circle') }} />
      <Tab.Screen name="Archive" component={ArchiveScreen} options={{ tabBarIcon: icon('archive') }} />
      {/* Opened from the Edit button on a task; hidden from the tab bar */}
      <Tab.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={{
          title: 'Edit Task',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
