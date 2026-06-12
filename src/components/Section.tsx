import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h2>
        {action}
      </div>
      <div className="rounded-lg border border-border bg-white p-4">{children}</div>
    </section>
  )
}
