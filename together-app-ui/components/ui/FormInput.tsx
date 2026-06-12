  interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string,
  error?: string,
  className?: string,
}


export default function FormInput({ label, id, error, className = '', ...props } : Props) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-sl">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg border px-4 py-3 text-sm text-sl outline-none transition-colors placeholder:text-sl-muted
          focus:ring-2 focus:ring-cr-pale
          ${error
            ? 'border-red-400 bg-red-50 focus:border-red-500'
            : 'border-gray-200 bg-white focus:border-cr'
          }`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
