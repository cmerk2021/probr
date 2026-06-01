import { cn } from '@/utils/cn';

interface Column<R> {
  key: string;
  header: React.ReactNode;
  render?: (row: R) => React.ReactNode;
  className?: string;
}

interface Props<R> {
  rows: R[];
  columns: Column<R>[];
  empty?: React.ReactNode;
  className?: string;
}

export function DataTable<R extends Record<string, unknown>>({
  rows,
  columns,
  empty,
  className,
}: Props<R>) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-surface-700 rounded-md">
        {empty ?? 'No data.'}
      </div>
    );
  }
  return (
    <div className={cn('overflow-x-auto rounded-md border border-surface-700', className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-800/70 text-[10px] uppercase tracking-wider text-slate-400">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn('px-3 py-2 text-left font-medium', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-surface-700 hover:bg-surface-800/60 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2 align-top', c.className)}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
