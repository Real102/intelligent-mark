import { AlertTriangle, AlertOctagon } from 'lucide-react'

interface StorageBannerProps {
  bytesInUse: number
  quotaBytes: number
}

export function StorageBanner({ bytesInUse, quotaBytes }: StorageBannerProps) {
  if (quotaBytes <= 0) return null
  const ratio = bytesInUse / quotaBytes
  if (ratio < 0.8) return null

  if (ratio >= 0.95) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <AlertOctagon size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">存储空间严重不足</div>
          <div className="mt-1 text-red-800">
            当前使用 {(ratio * 100).toFixed(1)}%，建议立即备份书签并清理旧快照，否则部分功能可能受限。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-medium">存储空间预警</div>
        <div className="mt-1 text-yellow-800">
          当前使用 {(ratio * 100).toFixed(1)}%，建议清理旧快照以释放空间。
        </div>
      </div>
    </div>
  )
}
