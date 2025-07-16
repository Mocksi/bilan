export type TagColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Returns the appropriate Bootstrap badge class for a given tag color
 * @param color - The tag color
 * @returns Bootstrap badge class name
 */
export const getTagColorClass = (color: TagColor): string => {
  switch (color) {
    case 'primary': return 'badge-primary'
    case 'secondary': return 'badge-secondary'
    case 'success': return 'badge-success'
    case 'warning': return 'badge-warning'
    case 'danger': return 'badge-danger'
    case 'info': return 'badge-info'
    default: return 'badge-secondary'
  }
} 