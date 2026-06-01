import { cn } from '@/utils/cn';

interface Props {
  lines?: number;
  className?: string;
}

export function LoadingState({ lines = 3, className }: Props) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      <div className="skeleton h-5 w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
