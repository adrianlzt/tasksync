import z from "zod";

// Task schemas
export const TaskListSchema = z.object({
  id: z.string(),
  google_list_id: z.string().nullable(),
  title: z.string(),
  updated_at: z.string().nullable(),
  synced_at: z.string(),
  created_at: z.string(),
});

export const TaskSchema = z.object({
  id: z.string(),
  google_task_id: z.string().nullable(),
  title: z.string(),
  notes: z.string().nullable(),
  status: z.string().nullable(),
  due: z.string().nullable(),
  completed_date: z.string().nullable(),
  parent_task_id: z.string().nullable(),
  position: z.string().nullable(),
  task_list_id: z.string().nullable(),
  updated: z.string().nullable(),
  synced_at: z.string(),
  created_at: z.string(),
});

// Keep Note schemas
export const KeepNoteSchema = z.object({
  id: z.string(),
  google_note_id: z.string().nullable(),
  title: z.string().nullable(),
  content: z.string().nullable(),
  color: z.string().nullable(),
  pinned: z.number(),
  archived: z.number(),
  trashed: z.number(),
  labels: z.string().nullable(),
  updated_at: z.string().nullable(),
  synced_at: z.string(),
  created_at: z.string(),
});

// Search schema
export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['tasks', 'notes', 'all']).default('all'),
});

// Chat schemas
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  context: z.array(ChatMessageSchema).optional(),
});

export const ToolCallSchema = z.object({
  tool: z.enum(['search', 'add_task', 'update_task', 'delete_task', 'add_note', 'update_note', 'delete_note']),
  parameters: z.record(z.any()),
  requires_confirmation: z.boolean().default(true),
});

// Inferred types
export type TaskList = z.infer<typeof TaskListSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type KeepNote = z.infer<typeof KeepNoteSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
