import { Search } from 'lucide-react'

interface SearchBoxProps {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}

export function SearchBox({ value, onChange, autoFocus }: SearchBoxProps) {
  return (
    <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-white px-3 focus-within:border-primary">
      <Search size={16} className="flex-shrink-0 text-text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索书签…"
        autoFocus={autoFocus}
        className="h-full flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
      />
    </div>
  )
}
