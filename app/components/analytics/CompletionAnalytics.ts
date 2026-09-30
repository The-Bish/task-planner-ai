export function calculateCompletionAnalytics(completedTasks: any[]) {
  let early = 0;
  let onTime = 0;
  let late = 0;

  completedTasks.forEach(t => {
    if (!t.completedAt || !t.dueDate) return;

    const completedDate = new Date(t.completedAt);
    const dueDate = new Date(t.dueDate);

    if (completedDate < dueDate) early++;
    else if (completedDate.toDateString() === dueDate.toDateString()) onTime++;
    else late++;
  });

  return { early, onTime, late };
}

export function calculateArchiveAnalytics(completedTasks: any[]) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const counters = {
    today: { early: 0, onTime: 0, late: 0 },
    week: { early: 0, onTime: 0, late: 0 },
    month: { early: 0, onTime: 0, late: 0 },
  };

  completedTasks.forEach(t => {
    if (!t.completedAt || !t.dueDate) return;

    const completedDate = new Date(t.completedAt);
    const dueDate = new Date(t.dueDate);

    const category =
      completedDate < dueDate
        ? "early"
        : completedDate.toDateString() === dueDate.toDateString()
        ? "onTime"
        : "late";

    if (completedDate.toDateString() === today.toDateString()) {
      counters.today[category]++;
    }

    if (completedDate >= startOfWeek) {
      counters.week[category]++;
    }

    if (completedDate >= startOfMonth) {
      counters.month[category]++;
    }
  });

  return counters;
}

