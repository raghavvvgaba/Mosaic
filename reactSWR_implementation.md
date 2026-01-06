# React SWR Implementation Plan

## Overview

This document outlines the comprehensive plan for integrating React SWR into the collaborative editor to manage remote data state for documents, user data, workspaces, and settings.

## Why SWR?

- **Automatic Caching**: Reduces redundant API calls
- **Revalidation**: Keeps data fresh with auto-revalidation
- **Deduplication**: Prevents duplicate requests
- **Optimistic Updates**: Instant UI feedback with `mutate()`
- **Real-time Sync**: Integrates with existing event system
- **Type Safety**: Full TypeScript support
- **Minimal Changes**: Works with existing Appwrite services

---

## File Structure

```
collaborative-editor/
├── lib/
│   ├── appwrite/              # Existing services (keep as-is)
│   │   ├── auth.ts
│   │   ├── documents.ts
│   │   ├── workspaces.ts
│   │   ├── preferences.ts
│   │   └── storage.ts
│   │
│   └── swr/                   # NEW: SWR utilities
│       ├── fetchers.ts        # Custom fetchers for Appwrite
│       ├── keys.ts            # Query key generators
│       └── config.ts          # Global SWR config
│
├── hooks/
│   └── swr/                   # NEW: SWR hooks by domain
│       ├── useDocuments.ts    # Document data hooks
│       ├── useUser.ts         # User data hooks
│       ├── useWorkspaces.ts   # Workspace hooks
│       ├── useSettings.ts     # Settings hooks
│       └── index.ts           # Barrel export
│
└── app/
    └── dashboard/
        └── layout.tsx         # Add SWRConfig provider
```

---

## Phase 1: Core Infrastructure

### 1.1 Install Dependencies

```bash
npm install swr
```

### 1.2 Create SWR Configuration

**File: `lib/swr/config.ts`**

```typescript
import { SWRConfiguration } from 'swr'

export const swrConfig: SWRConfiguration = {
  // Revalidate on focus
  revalidateOnFocus: true,

  // Revalidate on reconnect
  revalidateOnReconnect: true,

  // Don't revalidate on mount if data is fresh (within this time)
  revalidateOnMount: true,

  // Dedupe requests within this interval
  dedupingInterval: 2000,

  // Cache data for 5 minutes
  focusThrottleInterval: 5000,

  // Error retry strategy
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // Never retry on 404 or 401
    if (error.status === 404 || error.status === 401) return

    // Only retry up to 3 times
    if (retryCount >= 3) return

    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000)
  },

  // Global error handler
  onError: (error) => {
    console.error('SWR Error:', error)
  },

  // Use Compare function for shallow comparison
  compare: (a, b) => JSON.stringify(a) === JSON.stringify(b),
}
```

### 1.3 Create Query Keys

**File: `lib/swr/keys.ts`**

```typescript
// Query key generators for type-safe cache management

export const swrKeys = {
  // User keys
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
  },

  // Documents keys
  documents: {
    all: ['documents'] as const,
    list: (workspaceId?: string) => ['documents', 'list', workspaceId] as const,
    detail: (documentId: string) => ['documents', 'detail', documentId] as const,
    tree: (workspaceId?: string) => ['documents', 'tree', workspaceId] as const,
  },

  // Workspaces keys
  workspaces: {
    all: ['workspaces'] as const,
    list: () => ['workspaces', 'list'] as const,
    detail: (workspaceId: string) => ['workspaces', 'detail', workspaceId] as const,
    active: () => ['workspaces', 'active'] as const,
  },

  // Settings keys
  settings: {
    all: ['settings'] as const,
    theme: () => ['settings', 'theme'] as const,
    editor: () => ['settings', 'editor'] as const,
  },
}

// Type for key inference
type SwrKeys = typeof swrKeys
```

### 1.4 Create Fetchers

**File: `lib/swr/fetchers.ts`**

```typescript
import { databases } from '../appwrite/client'
import { databaseId } from '@/lib/db/types'
import { Query } from 'appwrite'

/**
 * Generic fetcher for Appwrite list queries
 */
export async function listFetcher<T>(
  collectionId: string,
  queries?: string[]
): Promise<T[]> {
  try {
    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      queries
    )
    return response.documents as T[]
  } catch (error) {
    console.error('List fetcher error:', error)
    throw error
  }
}

/**
 * Generic fetcher for single document
 */
export async function documentFetcher<T>(
  collectionId: string,
  documentId: string
): Promise<T> {
  try {
    const response = await databases.getDocument(
      databaseId,
      collectionId,
      documentId
    )
    return response as T
  } catch (error) {
    console.error('Document fetcher error:', error)
    throw error
  }
}

/**
 * User profile fetcher
 */
export async function userProfileFetcher(userId: string) {
  return documentFetcher<User>(userCollectionId, userId)
}

/**
 * User preferences fetcher
 */
export async function userPreferencesFetcher(userId: string) {
  const queries = [
    Query.equal('userId', userId),
    Query.limit(1),
  ]
  const results = await listFetcher<UserPreferences>(preferencesCollectionId, queries)
  return results[0]
}

/**
 * Documents list fetcher
 */
export async function documentsListFetcher(workspaceId?: string) {
  const queries = workspaceId
    ? [Query.equal('workspaceId', workspaceId)]
    : []
  return listFetcher<Document>(documentsCollectionId, queries)
}

/**
 * Document detail fetcher
 */
export async function documentDetailFetcher(documentId: string) {
  return documentFetcher<Document>(documentsCollectionId, documentId)
}

/**
 * Documents tree fetcher (nested structure)
 */
export async function documentsTreeFetcher(workspaceId?: string) {
  const queries = workspaceId
    ? [Query.equal('workspaceId', workspaceId)]
    : []
  const documents = await listFetcher<Document>(documentsCollectionId, queries)
  return buildDocumentTree(documents)
}

/**
 * Workspaces list fetcher
 */
export async function workspacesListFetcher() {
  return listFetcher<Workspace>(workspacesCollectionId)
}

/**
 * Workspace detail fetcher
 */
export async function workspaceDetailFetcher(workspaceId: string) {
  return documentFetcher<Workspace>(workspacesCollectionId, workspaceId)
}

/**
 * Helper to build tree structure from flat list
 */
function buildDocumentTree(documents: Document[]): DocumentTreeNode[] {
  // Build tree logic here
  const map = new Map<string, DocumentTreeNode>()
  const roots: DocumentTreeNode[] = []

  // Create nodes
  documents.forEach(doc => {
    map.set(doc.$id, { ...doc, children: [] })
  })

  // Build hierarchy
  documents.forEach(doc => {
    const node = map.get(doc.$id)!
    if (doc.parentId && map.has(doc.parentId)) {
      map.get(doc.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}
```

---

## Phase 2: Domain Hooks

### 2.1 User Hooks

**File: `hooks/swr/useUser.ts`**

```typescript
import useSWR, { useSWRConfig } from 'swr'
import { swrKeys } from '@/lib/swr/keys'
import { userProfileFetcher, userPreferencesFetcher } from '@/lib/swr/fetchers'
import { account } from '@/lib/appwrite/client'

export function useUserProfile(userId: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    userId ? swrKeys.user.profile(userId) : null,
    () => userProfileFetcher(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    profile: data,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  }
}

export function useUserPreferences(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? swrKeys.user.preferences(userId) : null,
    () => userPreferencesFetcher(userId),
    {
      revalidateOnFocus: false,
    }
  )

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    // Optimistic update
    mutate(async (current) => {
      const optimistic = { ...current, ...updates }
      return optimistic
    }, false)

    // Actual update
    try {
      const updated = await updatePreferencesService(userId, updates)
      mutate(updated) // Update with actual data
      return updated
    } catch (error) {
      mutate() // Revert on error
      throw error
    }
  }

  return {
    preferences: data,
    isLoading,
    isError: error,
    updatePreferences,
    mutate,
  }
}

export function useAuth() {
  const { data: session, error, mutate } = useSWR(
    'auth-session',
    async () => {
      try {
        return await account.get()
      } catch {
        return null
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  )

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    mutate() // Refresh session
  }

  const logout = async () => {
    await account.deleteSession('current')
    mutate(null) // Clear session
  }

  return {
    user: session,
    isAuthenticated: !!session,
    isLoading: !error && !session,
    isError: error,
    login,
    logout,
    mutate,
  }
}
```

### 2.2 Document Hooks

**File: `hooks/swr/useDocuments.ts`**

```typescript
import useSWR, { useSWRConfig } from 'swr'
import { swrKeys } from '@/lib/swr/keys'
import {
  documentsListFetcher,
  documentDetailFetcher,
  documentsTreeFetcher
} from '@/lib/swr/fetchers'

export function useDocuments(workspaceId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    swrKeys.documents.list(workspaceId),
    () => documentsListFetcher(workspaceId),
    {
      refreshInterval: 30000, // Poll every 30s for updates
    }
  )

  return {
    documents: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useDocument(documentId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    documentId ? swrKeys.documents.detail(documentId) : null,
    () => documentDetailFetcher(documentId),
    {
      revalidateOnFocus: false,
      refreshInterval: 10000, // Poll every 10s
    }
  )

  const updateDocument = async (updates: Partial<Document>) => {
    // Optimistic update
    mutate((current) => {
      if (!current) return current
      return { ...current, ...updates }
    }, false)

    try {
      const updated = await updateDocumentService(documentId, updates)
      mutate(updated)
      return updated
    } catch (error) {
      mutate() // Revert on error
      throw error
    }
  }

  return {
    document: data,
    isLoading,
    isError: error,
    updateDocument,
    mutate,
  }
}

export function useDocumentsTree(workspaceId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    swrKeys.documents.tree(workspaceId),
    () => documentsTreeFetcher(workspaceId)
  )

  return {
    tree: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
```

### 2.3 Workspace Hooks

**File: `hooks/swr/useWorkspaces.ts`**

```typescript
import useSWR from 'swr'
import { swrKeys } from '@/lib/swr/keys'
import { workspacesListFetcher, workspaceDetailFetcher } from '@/lib/swr/fetchers'

export function useWorkspaces() {
  const { data, error, isLoading, mutate } = useSWR(
    swrKeys.workspaces.list(),
    workspacesListFetcher
  )

  return {
    workspaces: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useWorkspace(workspaceId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? swrKeys.workspaces.detail(workspaceId) : null,
    () => workspaceDetailFetcher(workspaceId)
  )

  return {
    workspace: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useActiveWorkspace() {
  const { data: activeWorkspaceId } = useSWR(
    swrKeys.workspaces.active(),
    () => getActiveWorkspaceId() // From localStorage/preferences
  )

  const { data: workspace, ...rest } = useWorkspace(activeWorkspaceId || '')

  return {
    activeWorkspace: workspace,
    ...rest,
  }
}
```

### 2.4 Settings Hooks

**File: `hooks/swr/useSettings.ts`**

```typescript
import useSWR from 'swr'
import { swrKeys } from '@/lib/swr/keys'

export function useTheme() {
  const { data, error, isLoading, mutate } = useSWR(
    swrKeys.settings.theme(),
    () => getThemePreference() // From preferences service
  )

  const setTheme = async (theme: 'light' | 'dark' | 'system') => {
    // Optimistic update
    mutate(theme, false)

    try {
      await updateThemePreference(theme)
      mutate(theme)
    } catch (error) {
      mutate() // Revert
      throw error
    }
  }

  return {
    theme: data || 'system',
    isLoading,
    isError: error,
    setTheme,
    mutate,
  }
}

export function useEditorSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    swrKeys.settings.editor(),
    () => getEditorSettings() // From preferences service
  )

  const updateSettings = async (updates: Partial<EditorSettings>) => {
    mutate((current) => ({ ...current, ...updates }), false)

    try {
      const updated = await updateEditorSettingsService(updates)
      mutate(updated)
    } catch (error) {
      mutate()
      throw error
    }
  }

  return {
    settings: data,
    isLoading,
    isError: error,
    updateSettings,
    mutate,
  }
}
```

### 2.5 Barrel Export

**File: `hooks/swr/index.ts`**

```typescript
export * from './useUser'
export * from './useDocuments'
export * from './useWorkspaces'
export * from './useSettings'
```

---

## Phase 3: Setup & Integration

### 3.1 Add SWR Provider

**File: `app/dashboard/layout.tsx`**

```typescript
'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr/config'

export default function DashboardLayout({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}
```

---

## Phase 4: Migration Strategy

### 4.1 Priority Order

Migrate in this order for maximum impact:

1. **Documents List** (High frequency, high impact)
   - Components: `DocumentList`, `DocumentSidebar`
   - Benefit: Eliminate redundant list fetches

2. **User Profile** (High frequency)
   - Components: `ProfileSettings`, `UserAvatar`
   - Benefit: Cache user data across routes

3. **Workspaces** (Medium frequency)
   - Components: `WorkspaceSwitcher`, `WorkspaceList`
   - Benefit: Fast workspace switching

4. **Settings** (Low frequency)
   - Components: `SettingsPage`
   - Benefit: Instant settings updates

### 4.2 Migration Pattern

**Before (Current):**

```tsx
// In component
const [documents, setDocuments] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function load() {
    setLoading(true)
    try {
      const data = await listDocumentsService()
      setDocuments(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  load()
}, [workspaceId])
```

**After (SWR):**

```tsx
// In component
const { documents, isLoading, isError, mutate } = useDocuments(workspaceId)

if (isLoading) return <Skeleton />
if (isError) return <ErrorDisplay />

return <DocumentList documents={documents} />
```

### 4.3 Real-time Integration

Integrate with your existing real-time system:

```typescript
// In your real-time subscription handler
function handleDocumentUpdate(updatedDocument: Document) {
  // Update SWR cache
  mutate(
    swrKeys.documents.detail(updatedDocument.$id),
    updatedDocument,
    false // Don't revalidate
  )

  // Also update the list cache
  mutate(
    swrKeys.documents.list(workspaceId),
    (current) => {
      if (!current) return current
      return current.map(doc =>
        doc.$id === updatedDocument.$id ? updatedDocument : doc
      )
    },
    false
  )
}
```

---

## Phase 5: Testing

### 5.1 Unit Tests

```typescript
// Example test for useDocuments
describe('useDocuments', () => {
  it('should fetch documents list', async () => {
    const { result } = renderHook(() => useDocuments('workspace-123'))

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(3)
    })
  })

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useDocuments('invalid-workspace'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
```

### 5.2 Integration Tests

- Verify optimistic updates roll back on error
- Test cache invalidation across components
- Verify real-time updates integrate with SWR cache

---

## Best Practices

### 1. Key Generation

- Always use the `swrKeys` helpers
- Include all relevant parameters in the key
- Use `null` for keys that shouldn't fetch

### 2. Error Handling

- Always check `isError` state
- Implement error boundaries
- Show user-friendly error messages

### 3. Loading States

- Use `isLoading` for initial load
- Use `isValidating` for background updates
- Implement skeleton screens

### 4. Optimistic Updates

- Always provide fallback for errors
- Use `mutate(data, false)` for optimistic updates
- Call `mutate()` to revert on error

### 5. Cache Management

- Use `mutate()` to refresh stale data
- Use conditional fetching for optional data
- Implement cache warming for frequently accessed data

---

## Performance Metrics

Track before/after metrics:

| Metric | Before | After Target |
|--------|--------|--------------|
| API calls (document list) | 1 per view | 1 per 30s |
| API calls (user profile) | 1 per route | 1 per session |
| Time to content (cached) | N/A | < 100ms |
| Redundant requests | High | 0 |

---

## Timeline Estimate

- **Phase 1**: 2-3 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 1 hour
- **Phase 4**: 6-8 hours (incremental)
- **Phase 5**: 2-3 hours

**Total**: 15-21 hours

---

## References

- [SWR Documentation](https://swr.vercel.app/)
- [Appwrite TablesDB Docs](https://appwrite.io/docs/references/cloud/client-web/tablesDB)
- [React Query vs SWR](https://swr.vercel.app/docs/comparison)
