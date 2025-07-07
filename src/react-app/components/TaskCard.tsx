import { CheckCircle2, Circle, Calendar, FileText, Trash2 } from 'lucide-react';
import { Task } from '@/shared/types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onDelete?: (taskId: string) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
}

export default function TaskCard({ task, onDelete, onToggleComplete }: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

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
          <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {task.title}
          </h3>
          
          {task.notes && (
            <div className="mt-2 flex items-start gap-1">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 line-clamp-2">{task.notes}</p>
            </div>
          )}
          
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
