import React, { useState } from 'react'
import { getTagColorClass, type TagColor } from '@/lib/tag-utils'

export interface ConversationTag {
  id: string
  name: string
  color: TagColor
}

interface ConversationTagsProps {
  tags: ConversationTag[]
  onTagsChange: (tags: ConversationTag[]) => void
  availableTags?: ConversationTag[]
  className?: string
}

export const ConversationTags: React.FC<ConversationTagsProps> = ({
  tags,
  onTagsChange,
  availableTags = [],
  className = ''
}) => {
  const [newTagName, setNewTagName] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const addTag = (tag: ConversationTag) => {
    if (!tags.find(t => t.id === tag.id)) {
      onTagsChange([...tags, tag])
    }
  }

  const removeTag = (tagId: string) => {
    onTagsChange(tags.filter(t => t.id !== tagId))
  }

  const validateAndSanitizeTagName = (input: string): string | null => {
    // Trim whitespace
    const trimmed = input.trim()
    
    // Check length limits (2-50 characters)
    if (trimmed.length < 2 || trimmed.length > 50) {
      return null
    }
    
    // Allow only alphanumeric characters, spaces, hyphens, and underscores
    const allowedCharsRegex = /^[a-zA-Z0-9\s\-_]+$/
    if (!allowedCharsRegex.test(trimmed)) {
      return null
    }
    
    // Remove any potential HTML/script tags and normalize whitespace
    const sanitized = trimmed
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim()
    
    // Final check after sanitization
    if (sanitized.length < 2) {
      return null
    }
    
    return sanitized
  }

  const createCustomTag = () => {
    const sanitizedName = validateAndSanitizeTagName(newTagName)
    
    if (!sanitizedName) {
      // Could add user feedback here in the future
      console.warn('Invalid tag name: must be 2-50 characters, alphanumeric with spaces, hyphens, or underscores only')
      return
    }
    
    // Check for duplicate names (case-insensitive)
    const nameExists = tags.some(tag => 
      tag.name.toLowerCase() === sanitizedName.toLowerCase()
    )
    
    if (nameExists) {
      console.warn('Tag name already exists')
      return
    }
    
    const customTag: ConversationTag = {
      id: `custom-${Date.now()}`,
      name: sanitizedName,
      color: 'secondary'
    }
    addTag(customTag)
    setNewTagName('')
  }

  return (
    <div className={className}>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span key={tag.id} className={`badge ${getTagColorClass(tag.color)} position-relative`}>
            {tag.name}
            <button
              type="button"
              className="btn-close btn-close-white ms-2"
              aria-label="Remove tag"
              onClick={() => removeTag(tag.id)}
              style={{ fontSize: '0.7em' }}
            />
          </span>
        ))}
      </div>

      <div className="mb-3">
        <h6 className="text-muted mb-2">Available Tags</h6>
        <div className="d-flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              className={`btn btn-outline-secondary btn-sm ${tags.find(t => t.id === tag.id) ? 'disabled' : ''}`}
              onClick={() => addTag(tag)}
              disabled={!!tags.find(t => t.id === tag.id)}
            >
              <span className={`badge ${getTagColorClass(tag.color)} me-1`}></span>
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <h6 className="text-muted mb-2">Custom Tags</h6>
        {showCustomInput ? (
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Enter custom tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createCustomTag()}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={createCustomTag}
            >
              Add
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setShowCustomInput(false)
                setNewTagName('')
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowCustomInput(true)}
          >
            <i className="fas fa-plus me-1"></i>
            Add Custom Tag
          </button>
        )}
      </div>
    </div>
  )
}

export const TagDisplay: React.FC<{ tag: ConversationTag }> = ({ tag }) => {
  return (
    <span className={`badge ${getTagColorClass(tag.color)}`}>
      {tag.name}
    </span>
  )
} 