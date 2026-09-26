import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorState({ message = 'Failed to load data', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-risk-high/15 flex items-center justify-center">
        <AlertCircle className="text-risk-high" size={22} />
      </div>
      <div>
        <p className="text-white font-medium mb-1">Something went wrong</p>
        <p className="text-slate-400 text-sm max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={13} />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'No data found', description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-navy-600 flex items-center justify-center">
          <Icon className="text-slate-500" size={22} />
        </div>
      )}
      <div>
        <p className="text-slate-300 font-medium mb-1">{title}</p>
        {description && <p className="text-slate-500 text-sm max-w-xs">{description}</p>}
      </div>
    </div>
  );
}
