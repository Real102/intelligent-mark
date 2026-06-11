import { Search, X } from 'lucide-react'

interface SearchBoxProps {
  value: string
  onChange: (v: string) => void
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索书签"
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="清空"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-200"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
