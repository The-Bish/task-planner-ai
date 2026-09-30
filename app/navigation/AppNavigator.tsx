import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import CompletedScreen from '../screens/CompletedScreen';
import ArchiveScreen from '../screens/ArchiveScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Add Task" component={AddTaskScreen} />
      <Tab.Screen name="Completed" component={CompletedScreen} />
      <Tab.Screen name="Archive" component={ArchiveScreen} />
    </Tab.Navigator>
  );
}
