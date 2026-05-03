'use client'

interface Props {
  page: number,
  totalItems: number,
  perPage?: number,
  onChange: (newPage: number) => void,
}

interface PageBtnProps {
  onClick: () => void,
  disabled?: boolean,
  active?: boolean,
  label: string,
}


export default function Pagination({ page, totalItems, perPage = 8, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
      <span className="text-sm text-sl-muted">
        Showing {Math.min((page - 1) * perPage + 1, totalItems)}–{Math.min(page * perPage, totalItems)} of {totalItems} tasks
      </span>

      <div className="flex gap-1.5">
        <PageBtn onClick={() => onChange(page - 1)} disabled={page === 1} label="‹" />
        {pages.map(p => (
          <PageBtn key={p} onClick={() => onChange(p)} active={p === page} label={String(p)} />
        ))}
        <PageBtn onClick={() => onChange(page + 1)} disabled={page === totalPages} label="›" />
      </div>
    </div>
  )
}

function PageBtn({ onClick, disabled, active, label }: PageBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-md text-sm font-medium transition-all
        ${active
          ? 'bg-cr text-white'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'bg-white border border-gray-200 text-gray-700 hover:border-cr hover:text-cr'
        }`}
    >
      {label}
    </button>
  )
}
