interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-1.5 text-left"
    >
      <div>
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-text-secondary">{description}</div>
        )}
      </div>
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold ${
          checked ? 'text-success' : 'text-text-secondary'
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            checked ? 'bg-success' : 'bg-text-secondary/40'
          }`}
        />
        <span>{checked ? '开启' : '关闭'}</span>
      </div>
    </button>
  )
}
