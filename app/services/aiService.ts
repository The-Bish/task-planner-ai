// app/services/aiService.ts
import axios from 'axios';

export type ParsedTask = {
  id?: string;
  title: string;
  description: string;
  priority: 'urgent-important' | 'urgent-not-important' | 'not-urgent-important' | 'not-urgent-not-important';
  dueDate?: string | null;
  milestones: { id: string; title: string; due?: string | null }[];
  timelineItems: { id: string; start: string; end?: string | null; label: string }[];
};

// IMPORTANT: Replace with your localtunnel URL
const BACKEND_URL = 'https://tired-mammals-enter.loca.lt/api/parseTask';

export async function parseTaskWithAI(rawText: string): Promise<ParsedTask> {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('No input provided');
  }

  try {
    const resp = await axios.post(BACKEND_URL, { text: rawText }, { timeout: 30000 });
    return resp.data as ParsedTask;
  } catch (err) {
    console.warn('AI call failed, using mock parser', err);
    return mockParse(rawText);
  }
}

function mockParse(text: string): ParsedTask {
  const id = () => Math.random().toString(36).slice(2, 9);
  const title = text.split('\n')[0].slice(0, 60) || 'Untitled task';

  return {
    id: id(),
    title,
    description: text,
    priority: 'not-urgent-important',
    dueDate: null,
    milestones: [
      { id: id(), title: 'Draft plan', due: null },
      { id: id(), title: 'Review with team', due: null }
    ],
    timelineItems: [
      { id: id(), start: new Date().toISOString(), end: null, label: 'Phase 1' }
    ]
  };
}
