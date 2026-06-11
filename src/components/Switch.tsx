import type { ReactNode } from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: ReactNode
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div className="flex-1">
        <label
          className={`text-sm font-medium text-gray-900 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </label>
        {description && <div className="mt-0.5 text-xs text-gray-500">{description}</div>}
      </div>
    </div>
  )
}
