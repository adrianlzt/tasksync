import { CheckCircle2, Circle, Calendar, Trash2, Folder } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Task } from '@/shared/types';
import { format } from 'date-fns';

const Highlight = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim() || !text) {
    return <>{text}</>;
  }
  const sanitizedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${sanitizedHighlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 px-0 rounded-sm">
            {part}
          </mark>
        ) : (
          <>{part}</>
        )
      )}
    </>
  );
};

interface TaskCardProps {
  task: Task;
  taskListTitle?: string;
  onDelete?: (taskId: string) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  searchQuery?: string;
  activeTab?: string;
}

export default function TaskCard({ task, onDelete, onToggleComplete, taskListTitle, onUpdate, searchQuery, activeTab }: TaskCardProps) {
  const [currentTitle, setCurrentTitle] = useState(task.title);

  useEffect(() => {
    setCurrentTitle(task.title);
  }, [task]);

  const isCompleted = task.status === 'completed';
  const dueDate = task.due ? new Date(task.due) : null;
  const updatedDate = task.updated ? new Date(task.updated) : null;
  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

  const showNotes = searchQuery && task.notes && task.notes.toLowerCase().includes(searchQuery.toLowerCase());

  const showTaskList = activeTab === 'all' && taskListTitle;

  const handleTitleBlur = () => {
    const newTitle = currentTitle ? currentTitle.trim() : '';
    if (newTitle && newTitle !== task.title) {
      onUpdate?.(task.id, { title: newTitle });
    } else if (!newTitle) {
      setCurrentTitle(task.title); // revert if empty
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
          {searchQuery ? (
            <div className={`font-medium w-full bg-transparent px-1 -mx-1 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              <Highlight text={task.title || ''} highlight={searchQuery} />
            </div>
          ) : (
            <input
              value={currentTitle || ''}
              onChange={(e) => setCurrentTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className={`font-medium w-full bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}
              disabled={isCompleted}
              placeholder="Task title"
            />
          )}

          {showNotes && (
            <div className="mt-1 text-sm text-gray-600 px-1 -mx-1">
              <Highlight text={task.notes!} highlight={searchQuery} />
            </div>
          )}

          {showTaskList && (
            <div className="mt-2 flex items-center gap-1 text-gray-500">
              <Folder className="w-4 h-4" />
              <span className="text-sm">{taskListTitle}</span>
            </div>
          )}
          
        </div>
        
        <div className="ml-auto pl-4 flex flex-col items-end gap-1 text-right whitespace-nowrap">
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-red-600 transition-colors mb-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {dueDate && (
            <div className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar className="w-3 h-3" />
              <span>
                Due: {format(dueDate, 'MMM d, yyyy')}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>
          )}
          {updatedDate && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>Updated: {format(updatedDate, 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
