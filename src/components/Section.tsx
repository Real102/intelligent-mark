import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
