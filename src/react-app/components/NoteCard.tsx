import { Pin, Archive, Tag } from 'lucide-react';
import { KeepNote } from '@/shared/types';
import { format } from 'date-fns';

interface NoteCardProps {
  note: KeepNote;
}

const colorMap: Record<string, string> = {
  'default': 'bg-white',
  'red': 'bg-red-100 border-red-200',
  'orange': 'bg-orange-100 border-orange-200',
  'yellow': 'bg-yellow-100 border-yellow-200',
  'green': 'bg-green-100 border-green-200',
  'teal': 'bg-teal-100 border-teal-200',
  'blue': 'bg-blue-100 border-blue-200',
  'darkblue': 'bg-blue-200 border-blue-300',
  'purple': 'bg-purple-100 border-purple-200',
  'pink': 'bg-pink-100 border-pink-200',
  'brown': 'bg-yellow-200 border-yellow-300',
  'gray': 'bg-gray-100 border-gray-200',
};

export default function NoteCard({ note }: NoteCardProps) {
  const colorClass = colorMap[note.color || 'default'] || colorMap.default;
  const updatedDate = note.updated_at ? new Date(note.updated_at) : null;
  const labels = note.labels ? note.labels.split(',').filter(Boolean) : [];

  return (
    <div className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${colorClass}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        {note.title && (
          <h3 className="font-medium text-gray-900 line-clamp-2">{note.title}</h3>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {note.pinned === 1 && (
            <Pin className="w-4 h-4 text-gray-600" />
          )}
          {note.archived === 1 && (
            <Archive className="w-4 h-4 text-gray-600" />
          )}
        </div>
      </div>

      {note.content && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
            {note.content}
          </p>
        </div>
      )}

      {labels.length > 0 && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <Tag className="w-3 h-3 text-gray-500" />
          {labels.map((label, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full"
            >
              {label.trim()}
            </span>
          ))}
        </div>
      )}

      {updatedDate && (
        <div className="text-xs text-gray-500">
          Updated {format(updatedDate, 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
}
