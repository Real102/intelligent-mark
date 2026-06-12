import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export type SortMethodValue = 'visit-count'

export interface SortMethodOption<V extends string = SortMethodValue> {
  value: V
  label: string
}

interface SortMethodProps<V extends string> {
  value: V
  onChange: (v: V) => void
  options: SortMethodOption<V>[]
  label: string
}

export function SortMethod<V extends string>({
  value,
  onChange,
  options,
  label,
}: SortMethodProps<V>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative w-full py-1.5" ref={ref}>
      <div className="flex w-full items-center justify-between">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-text-secondary hover:bg-surface"
        >
          <span>{current.label}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-white shadow-md"
        >
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-sm ${
                  opt.value === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-primary hover:bg-surface'
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
