# Contributing to Meta-Governor

Thank you for considering contributing to Meta-Governor! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## 📜 Code of Conduct

This project follows a Code of Conduct that all contributors are expected to uphold. Be respectful, professional, and constructive in all interactions.

---

## 🤝 How Can I Contribute?

### Types of Contributions

- 🐛 **Bug Reports** - Found a bug? Let us know!
- ✨ **Feature Requests** - Have an idea? We'd love to hear it!
- 📖 **Documentation** - Improve docs, fix typos, add examples
- 🔧 **Code Contributions** - Bug fixes, new features, improvements
- 💬 **Community Support** - Answer questions in Discussions

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+
- npm 9+
- Git
- Azure AD App Registration (for testing)
- Access to SharePoint Online site

### Setup Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/meta-governor.git
   cd meta-governor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp packages/api/.env.example packages/api/.env
   cp packages/dashboard/.env.example packages/dashboard/.env
   
   # Edit .env files with your credentials
   ```

4. **Place your certificate**
   ```bash
   # Add private.key to packages/engine/certs/
   # Never commit this file!
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: API
   npm run api
   
   # Terminal 2: Dashboard
   cd packages/dashboard
   npm run dev
   ```

6. **Verify setup**
   - Open http://localhost:5173
   - Run a test audit
   - Check console for errors

---

## 💻 Coding Standards

### TypeScript

- **Use strict mode** - All packages use strict TypeScript
- **Type everything** - Avoid `any`, use proper interfaces
- **No implicit returns** - Be explicit with return types

**Good:**
```typescript
interface RemediateRequest {
    siteUrl: string
    libraryName: string
    itemId: number
    fields: FieldUpdate[]
}

async function remediateItem(req: RemediateRequest): Promise<void> {
    // Implementation
}
```

**Bad:**
```typescript
async function remediateItem(req: any) {
    // No types, no explicit return
}
```

### React

- **Functional components only** - No class components
- **Hooks** - Use React hooks properly
- **Descriptive names** - `handleSave` not `doThing`

**Good:**
```typescript
export default function FixPanel() {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const handleSave = async () => {
        setSaving(true)
        try {
            await apiClient.remediateItem(...)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }
    
    return (
        <div>
            <button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
            </button>
            {error && <ErrorMessage>{error}</ErrorMessage>}
        </div>
    )
}
```

### File Organization

```
packages/
  api/
    src/
      routes/        # Express routes
      utils/         # Helper functions
      types/         # Local types
      index.ts       # Server entry point
  
  dashboard/
    src/
      pages/         # Full page components
      components/    # Reusable components
      lib/           # Utilities (apiClient, etc.)
      store/         # Zustand store
      App.tsx        # App root
      main.tsx       # React entry point
  
  engine/
    src/
      auditor/       # Audit logic
      validators/    # Field validators
      index.ts       # Engine entry point
  
  shared/
    types.ts         # Shared TypeScript interfaces
```

### Naming Conventions

- **Components**: PascalCase - `FixPanel.tsx`
- **Hooks**: camelCase with `use` prefix - `useGovernanceStore.ts`
- **Utilities**: camelCase - `apiClient.ts`
- **Types**: PascalCase - `AuditManifest`
- **Interfaces**: PascalCase with `I` prefix (optional) - `IGovernanceStore`

---

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Build process, dependencies, etc.

### Examples

**Good:**
```
feat(dashboard): add bulk selection to remediation queue

Added checkboxes to queue items and "Select All" button.
Users can now select multiple items for future bulk fixes.

Closes #42
```

```
fix(api): handle 429 throttling errors from SharePoint

Added exponential backoff retry logic when SharePoint
returns 429 Too Many Requests. Respects Retry-After header.

Fixes #38
```

**Bad:**
```
fixed stuff
```

```
Updated files
```

---

## 🔄 Pull Request Process

### Before Submitting

1. ✅ **Test your changes** - Run locally, verify functionality
2. ✅ **Follow coding standards** - TypeScript strict, proper types
3. ✅ **Update documentation** - README, comments, etc.
4. ✅ **Write descriptive commits** - Follow commit guidelines
5. ✅ **Keep PRs focused** - One feature/fix per PR

### PR Checklist

- [ ] Code follows TypeScript/React standards
- [ ] All TypeScript errors resolved
- [ ] Tested locally (API + Dashboard)
- [ ] Documentation updated if needed
- [ ] Commit messages follow guidelines
- [ ] PR description explains changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #XX
```

### Review Process

1. Submit PR with clear description
2. Wait for maintainer review (usually 1-3 days)
3. Address feedback if requested
4. Maintainer merges once approved

---

## 🐛 Reporting Bugs

### Before Reporting

1. **Search existing issues** - Your bug may already be reported
2. **Try latest version** - Bug might be fixed in main branch
3. **Reproduce** - Can you make it happen again?

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what's wrong

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen instead

**Screenshots**
Add screenshots if applicable

**Environment:**
- OS: [e.g., Windows 11, macOS 14]
- Browser: [e.g., Chrome 120, Firefox 121]
- Node.js: [e.g., 20.10.0]
- Meta-Governor version: [e.g., 1.0.0]

**Additional context**
Any other relevant information
```

**Submit at:** https://github.com/yourusername/meta-governor/issues/new

---

## ✨ Suggesting Features

### Before Suggesting

1. **Check existing feature requests** - May already be planned
2. **Review roadmap** - May be in upcoming version
3. **Consider scope** - Does it fit the project vision?

### Feature Request Template

```markdown
**Is your feature related to a problem?**
Clear description of the problem

**Describe the solution**
What you'd like to happen

**Describe alternatives**
Other solutions you've considered

**Use case**
Who would benefit and how?

**Additional context**
Mockups, examples, etc.
```

**Submit at:** https://github.com/yourusername/meta-governor/discussions/new?category=ideas

---

## 🏗️ Architecture Guidelines

### Adding New Features

1. **API Route** (`packages/api/src/routes/`)
   - Create new route file or add to existing
   - Follow RESTful conventions
   - Add TypeScript types
   - Handle errors gracefully

2. **Dashboard Page** (`packages/dashboard/src/pages/`)
   - Create new page component
   - Add to router in `App.tsx`
   - Use Zustand for state if needed
   - Follow existing UI patterns

3. **Shared Types** (`packages/shared/types.ts`)
   - Add interfaces for new data structures
   - Export for use in API and Dashboard

### Example: Adding New Endpoint

```typescript
// 1. Add to packages/api/src/routes/myFeature.ts
import { Router } from 'express'

export const myFeatureRouter = Router()

myFeatureRouter.post('/action', async (req, res) => {
    try {
        const { param } = req.body
        // Implementation
        res.json({ success: true })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// 2. Register in packages/api/src/index.ts
import { myFeatureRouter } from './routes/myFeature'
app.use('/api/myFeature', myFeatureRouter)

// 3. Add types to packages/shared/types.ts
export interface MyFeatureRequest {
    param: string
}

export interface MyFeatureResponse {
    success: boolean
}

// 4. Add to packages/dashboard/src/lib/apiClient.ts
export async function callMyFeature(
    req: MyFeatureRequest
): Promise<MyFeatureResponse> {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/myFeature/action`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
        }
    )
    return response.json()
}
```

---

## 📚 Documentation Guidelines

### README.md
- Keep installation steps clear and concise
- Include screenshots for UI features
- Update feature list when adding features
- Keep troubleshooting section current

### Code Comments
- Explain **why**, not **what**
- Document complex logic
- Add JSDoc for public APIs

**Good:**
```typescript
// Exponential backoff prevents overwhelming SharePoint
// when it returns 429 throttling errors
const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
```

**Bad:**
```typescript
// Wait
await sleep(delay)
```

### API Documentation
- Document all endpoints in ARCHITECTURE.md
- Include request/response examples
- Note required permissions

---

## 🧪 Testing Guidelines

While we don't currently have automated tests, manual testing is critical:

### Manual Testing Checklist

**Before submitting PR:**

- [ ] Run full audit on test site
- [ ] Fix at least one item
- [ ] Switch between libraries
- [ ] Test re-audit
- [ ] Check logging (both local and SharePoint)
- [ ] Test with different field types (text, taxonomy, choice, lookup, user)
- [ ] Verify error handling (network errors, invalid values, etc.)
- [ ] Test eject and reload
- [ ] Check browser console for errors
- [ ] Test on different browsers (Chrome, Firefox, Edge)

**For UI changes:**

- [ ] Test light and dark themes
- [ ] Test responsive behavior
- [ ] Check loading states
- [ ] Verify error messages display correctly

---

## 🌍 Community

- 💬 [GitHub Discussions](https://github.com/yourusername/meta-governor/discussions) - Questions, ideas, general chat
- 🐛 [Issues](https://github.com/yourusername/meta-governor/issues) - Bug reports
- 📖 [Wiki](https://github.com/yourusername/meta-governor/wiki) - Extended documentation

---

## 📞 Getting Help

- **Questions?** Ask in Discussions
- **Stuck?** Open an issue with "question" label
- **Want to chat?** Start a discussion thread

---

## 🙏 Recognition

Contributors will be recognized in:
- README contributors section
- Release notes
- GitHub contributors page

---

**Thank you for contributing to Meta-Governor!** 🎉

Your contributions help SharePoint administrators everywhere manage metadata governance more effectively.
