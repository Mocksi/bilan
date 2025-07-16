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

  const createCustomTag = () => {
    if (newTagName.trim()) {
      const customTag: ConversationTag = {
        id: `custom-${Date.now()}`,
        name: newTagName.trim(),
        color: 'secondary'
      }
      addTag(customTag)
      setNewTagName('')
    }
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