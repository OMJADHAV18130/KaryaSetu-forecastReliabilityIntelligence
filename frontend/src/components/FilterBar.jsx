import clsx from 'clsx';

export default function FilterBar({ filters = [], onChange, className = '' }) {
  // filters: [{ id, label, options: [{value, label}], value }]
  return (
    <div className={clsx('flex flex-wrap items-center gap-3', className)}>
      {filters.map(filter => (
        <div key={filter.id} className="flex flex-col gap-0.5">
          {filter.label && (
            <label htmlFor={filter.id} className="text-[10px] text-slate-500 uppercase tracking-wider">
              {filter.label}
            </label>
          )}
          <select
            id={filter.id}
            value={filter.value || ''}
            onChange={e => onChange(filter.id, e.target.value)}
            className="bg-navy-600 border border-border text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent-cyan transition-colors"
          >
            {filter.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
