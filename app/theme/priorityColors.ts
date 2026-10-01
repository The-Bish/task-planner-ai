// One place for the priority colours, used by every screen.
export const priorityColors: Record<string, string> = {
  'urgent-important': '#2ecc71',
  'urgent-not-important': '#3498db',
  'not-urgent-important': '#f39c12',
  'not-urgent-not-important': '#e74c3c',
};

export const priorityLabels: Record<string, string> = {
  'urgent-important': 'Urgent & Important',
  'urgent-not-important': 'Urgent & Not Important',
  'not-urgent-important': 'Not Urgent & Important',
  'not-urgent-not-important': 'Not Urgent & Not Important',
};

export const getPriorityColor = (priority?: string) =>
  (priority && priorityColors[priority]) || '#999999';

// Soft see-through version of the colour, used for the tile background
export const getPriorityTint = (priority?: string) =>
  `${getPriorityColor(priority)}26`;

export const getPriorityLabel = (priority?: string) =>
  (priority && priorityLabels[priority]) || 'No priority';
