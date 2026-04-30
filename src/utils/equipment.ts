import { EQUIPMENT_LIFESPAN_YEARS } from '../types'
import type { EquipmentCategory, EquipmentStatus } from '../types'

/**
 * 設置日・保証期限からステータスを自動判定する
 * installedDate / warrantyExpiry は ISO string または undefined
 */
export function calcEquipmentStatus(
  category: EquipmentCategory,
  installedDate?: string,
  warrantyExpiry?: string,
): EquipmentStatus {
  if (!installedDate) return 'unknown'

  const now = new Date()
  const installed = new Date(installedDate)
  const yearsElapsed = (now.getTime() - installed.getTime()) / (1000 * 60 * 60 * 24 * 365)
  const lifespan = EQUIPMENT_LIFESPAN_YEARS[category]

  if (warrantyExpiry) {
    const expiry = new Date(warrantyExpiry)
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntilExpiry < 90 && daysUntilExpiry > 0) return 'warranty_soon'
  }

  if (yearsElapsed >= lifespan) return 'replace_soon'
  if (yearsElapsed >= lifespan * 0.8) return 'check_needed'

  return 'good'
}
