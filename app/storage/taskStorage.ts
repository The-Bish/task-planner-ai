import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_KEY = 'TASKS_ACTIVE';
const COMPLETED_KEY = 'TASKS_COMPLETED';

// Load Active Tasks
export const loadActiveTasks = async () => {
  try {
    const json = await AsyncStorage.getItem(ACTIVE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

// Save Active Tasks
export const saveActiveTasks = async (tasks: any[]) => {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(tasks));
};

// Load Completed Tasks
export const loadCompletedTasks = async () => {
  try {
    const json = await AsyncStorage.getItem(COMPLETED_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

// Save Completed Tasks
export const saveCompletedTasks = async (tasks: any[]) => {
  await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(tasks));
};
