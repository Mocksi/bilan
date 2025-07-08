## Description

<!-- Provide a brief description of what this PR does -->

**Type of Change:**
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📚 Documentation update
- [ ] 🧹 Code cleanup/refactoring
- [ ] ⚡ Performance improvement
- [ ] 🔧 Build/CI changes

## Related Issues

<!-- Link to related issues -->
Fixes #(issue number)
Related to #(issue number)

## Changes Made

<!-- Describe the changes in detail -->

### SDK Changes
- [ ] Added new APIs
- [ ] Modified existing APIs  
- [ ] Updated types/interfaces
- [ ] Performance improvements
- [ ] Bug fixes

### Server Changes
- [ ] New endpoints
- [ ] Database changes
- [ ] API modifications
- [ ] Bug fixes

### Dashboard Changes
- [ ] New components
- [ ] UI improvements
- [ ] Bug fixes
- [ ] Performance improvements

## Testing

<!-- Describe how you tested your changes -->

### Manual Testing
- [ ] Tested in browser environment
- [ ] Tested in Node.js environment
- [ ] Tested with NextJS example
- [ ] Tested edge cases

### Automated Testing
- [ ] All existing tests pass
- [ ] Added new tests for new functionality
- [ ] Updated tests for modified functionality
- [ ] Test coverage maintained/improved

**Test Results:**
```
npm test output here...
```

## Bundle Size Impact

<!-- For SDK changes, include bundle size impact -->

### Before
- Bundle size: XXX KB
- Gzipped: XXX KB

### After  
- Bundle size: XXX KB
- Gzipped: XXX KB

### Impact
- [ ] No size impact
- [ ] Size decreased
- [ ] Size increased (justified below)

**Size increase justification:**
<!-- If bundle size increased, explain why it's necessary -->

## Breaking Changes

<!-- List any breaking changes -->

- [ ] No breaking changes
- [ ] Breaking changes (documented below)

**Breaking Changes:**
<!-- Describe what breaks and how users should migrate -->

```typescript
// Before
old.api()

// After  
new.api()
```

## Documentation

- [ ] Updated README.md
- [ ] Updated API documentation
- [ ] Updated examples
- [ ] Added JSDoc comments
- [ ] Updated CHANGELOG.md

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance decreased (justified below)

**Performance notes:**
<!-- Describe performance changes -->

## Checklist

<!-- Check all that apply -->

### Code Quality
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is well-commented
- [ ] No console.log statements left in production code
- [ ] TypeScript strict mode compliance

### Testing
- [ ] All tests pass locally
- [ ] Added tests for new functionality
- [ ] Test coverage is adequate
- [ ] Manual testing completed

### Documentation
- [ ] Code is self-documenting
- [ ] Added JSDoc for public APIs
- [ ] Updated relevant documentation
- [ ] Added/updated examples if needed

### Security & Privacy
- [ ] No secrets or sensitive data in code
- [ ] No new security vulnerabilities introduced
- [ ] Privacy implications considered
- [ ] Input validation added where needed

## Additional Context

<!-- Any additional information that reviewers should know -->

### Screenshots/GIFs
<!-- If UI changes, include screenshots -->

### Migration Guide
<!-- If breaking changes, provide migration guidance -->

### Future Considerations
<!-- Any follow-up work or considerations -->

## Reviewer Checklist

<!-- For reviewers - not filled by PR author -->

- [ ] Code review completed
- [ ] Tests reviewed and adequate
- [ ] Documentation reviewed
- [ ] Breaking changes acceptable
- [ ] Performance impact acceptable
- [ ] Ready to merge 