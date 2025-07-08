import { CheckCircle2, Circle, Calendar, FileText, Trash2, Folder } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Task } from '@/shared/types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  taskListTitle?: string;
  onDelete?: (taskId: string) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

export default function TaskCard({ task, onDelete, onToggleComplete, taskListTitle, onUpdate }: TaskCardProps) {
  const [currentTitle, setCurrentTitle] = useState(task.title);
  const [currentNotes, setCurrentNotes] = useState(task.notes || '');

  useEffect(() => {
    setCurrentTitle(task.title);
    setCurrentNotes(task.notes || '');
  }, [task]);

  const isCompleted = task.status === 'completed';
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

  const handleTitleBlur = () => {
    const newTitle = currentTitle ? currentTitle.trim() : '';
    if (newTitle && newTitle !== task.title) {
      onUpdate?.(task.id, { title: newTitle });
    } else if (!newTitle) {
      setCurrentTitle(task.title); // revert if empty
    }
  };

  const handleNotesBlur = () => {
    if (currentNotes.trim() !== (task.notes || '').trim()) {
      onUpdate?.(task.id, { notes: currentNotes.trim() });
    }
  };

  return (
    <div className={`p-4 bg-white rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete?.(task.id, !isCompleted)}
          className="mt-1 text-gray-400 hover:text-blue-600 transition-colors"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <input
            value={currentTitle || ''}
            onChange={(e) => setCurrentTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className={`font-medium w-full bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}
            disabled={isCompleted}
            placeholder="Task title"
          />

          {taskListTitle && (
            <div className="mt-2 flex items-center gap-1 text-gray-500">
              <Folder className="w-4 h-4" />
              <span className="text-sm">{taskListTitle}</span>
            </div>
          )}
          
          <div className="mt-2 flex items-start gap-1">
            <FileText className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
            <textarea
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes..."
              className="text-sm text-gray-600 w-full bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1 resize-none"
              rows={1}
              disabled={isCompleted}
            />
          </div>
          
          {dueDate && (
            <div className={`mt-2 flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                Due {format(dueDate, 'MMM d, yyyy')}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>
          )}
        </div>
        
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
