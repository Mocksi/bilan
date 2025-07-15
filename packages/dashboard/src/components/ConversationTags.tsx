import React, { useState } from 'react'

export interface ConversationTag {
  id: string
  name: string
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
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
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const predefinedTags: ConversationTag[] = [
    { id: 'payment-issue', name: 'Payment Issue', color: 'danger' },
    { id: 'onboarding', name: 'Onboarding', color: 'primary' },
    { id: 'feature-request', name: 'Feature Request', color: 'info' },
    { id: 'bug-report', name: 'Bug Report', color: 'warning' },
    { id: 'success-story', name: 'Success Story', color: 'success' },
    { id: 'confusion', name: 'User Confusion', color: 'secondary' },
    { id: 'escalation', name: 'Needs Escalation', color: 'danger' },
    { id: 'improvement', name: 'Improvement Needed', color: 'warning' }
  ]

  const allAvailableTags = [...predefinedTags, ...availableTags]

  const addTag = (tag: ConversationTag) => {
    if (!tags.find(t => t.id === tag.id)) {
      onTagsChange([...tags, tag])
    }
    setIsAddingTag(false)
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

  const getTagColorClass = (color: ConversationTag['color']) => {
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

  return (
    <div className={className}>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span key={tag.id} className={`badge ${getTagColorClass(tag.color)} position-relative`}>
            {tag.name}
            <button
              type="button"
              className="btn-close btn-close-white ms-1"
              aria-label="Remove tag"
              onClick={() => removeTag(tag.id)}
              style={{ fontSize: '0.65em' }}
            />
          </span>
        ))}
        
        {!isAddingTag && (
          <button
            onClick={() => setIsAddingTag(true)}
            className="btn btn-sm btn-outline-primary"
          >
            + Add tag
          </button>
        )}
      </div>

      {isAddingTag && (
        <div className="card card-sm">
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Add custom tag</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createCustomTag()}
                />
                <button
                  className="btn btn-primary"
                  onClick={createCustomTag}
                  disabled={!newTagName.trim()}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="form-label">Or choose from predefined tags</label>
              <div className="d-flex flex-wrap gap-2">
                {allAvailableTags
                  .filter(tag => !tags.find(t => t.id === tag.id))
                  .map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag)}
                      className={`btn btn-sm btn-outline-${tag.color}`}
                    >
                      {tag.name}
                    </button>
                  ))}
              </div>
            </div>
            
            <div className="d-flex justify-content-end">
              <button
                onClick={() => {
                  setIsAddingTag(false)
                  setNewTagName('')
                }}
                className="btn btn-sm btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const TagDisplay: React.FC<{ tag: ConversationTag }> = ({ tag }) => {
  const getTagColorClass = (color: ConversationTag['color']) => {
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

  return (
    <span className={`badge ${getTagColorClass(tag.color)}`}>
      {tag.name}
    </span>
  )
} 