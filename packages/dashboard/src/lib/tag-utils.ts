export type TagColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Returns the appropriate Tailwind CSS badge classes for a given tag color
 * @param color - The tag color
 * @returns Tailwind CSS badge class names
 */
export const getTagColorClass = (color: TagColor): string => {
  switch (color) {
    case 'primary': return 'bg-blue-100 text-blue-800'
    case 'secondary': return 'bg-gray-100 text-gray-800'
    case 'success': return 'bg-green-100 text-green-800'
    case 'warning': return 'bg-yellow-100 text-yellow-800'
    case 'danger': return 'bg-red-100 text-red-800'
    case 'info': return 'bg-cyan-100 text-cyan-800'
    default: return 'bg-gray-100 text-gray-800'
  }
} 