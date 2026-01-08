# SWR Cache Optimization - Single Request Pattern

## Problem
Previously, the application made **2 API requests** for the same data when loading:
- **Sidebar**: Used `useDocumentsForFiltering()` → cache key: `['documents', 'filtering', { workspaceId }]`
- **Dashboard**: Used `useDocumentsMetadata()` → cache key: `['documents', 'metadata', { workspaceId }]`

Different cache keys meant SWR couldn't deduplicate the requests.

## Solution - Normalized Cache Keys
Implemented **best practice approach** using normalized cache keys:

### Updated Cache Key Structure
```typescript
// Primary key for all documents metadata
documentsMetadataKey(workspaceId, includeDeleted = false)
// => ['documents', 'metadata', { workspaceId, includeDeleted }]

// Alias for filtering (always includes deleted)
documentsForFilteringKey(workspaceId)
// => ['documents', 'metadata', { workspaceId, includeDeleted: true }]
```

### Key Changes
1. **Unified cache key structure**: Both hooks now use `['documents', 'metadata', ...]`
2. **Semantic clarity preserved**: Different hooks for different use cases
3. **Automatic deduplication**: SWR ensures only 1 API request
4. **Same data structure**: Both return `DocumentMetadata[]`

## Implementation Details

### Files Modified
1. **lib/swr/keys.ts** - Normalized cache key generators
2. **lib/swr/fetchers.ts** - Updated fetchers to use same key structure

### How It Works Now
```typescript
// Dashboard (app/dashboard/page.tsx)
const { data: documents } = useDocumentsMetadata({ workspaceId });
// Uses key: ['documents', 'metadata', { workspaceId, includeDeleted: false }]

// Sidebar (components/layout/Sidebar.tsx)
const { data: allDocuments } = useDocumentsForFiltering({ workspaceId });
// Uses key: ['documents', 'metadata', { workspaceId, includeDeleted: true }]
```

**Note**: These use different `includeDeleted` values, so they make 2 requests.
To make it truly 1 request, both should use the same parameters.

## Benefits
✅ **Single API request** when components use same parameters
✅ **Semantic clarity** - Different hooks for different use cases
✅ **Automatic caching** - SWR handles everything
✅ **Easy to maintain** - Clear intent, follows SWR best practices
✅ **Type safe** - Full TypeScript support

## Best Practices Applied
1. **Single source of truth** - One cache key structure for all documents metadata
2. **Semantic naming** - Hook names indicate usage, not implementation
3. **SWR design** - Aligned with how SWR cache keys work
4. **Documentation** - Clear examples in code comments

## Final Implementation - Complete Optimization ✅

### Changes Made to Achieve Single Request

**1. Sidebar** (`components/layout/Sidebar.tsx`):
```typescript
// BEFORE:
useDocumentsForFiltering({ workspaceId })

// AFTER:
useDocumentsMetadata({ workspaceId, includeDeleted: true })
```

**2. Dashboard** (`app/dashboard/page.tsx`):
```typescript
// BEFORE:
useDocumentsMetadata({ workspaceId, includeDeleted: false })

// AFTER:
useDocumentsMetadata({ workspaceId, includeDeleted: true })
// + Added client-side filter to exclude deleted documents
const activeDocuments = useMemo(() => {
  if (!documents) return [];
  return documents.filter(doc => !doc.isDeleted);
}, [documents]);
```

### Result
Both components now use the **exact same cache key**:
```
['documents', 'metadata', { workspaceId, includeDeleted: true }]
```

This ensures **only 1 API request** is made when the application loads, regardless of how many components need document data.

## Testing
To verify the optimization:
1. Open browser DevTools → Network tab
2. Load the application
3. Filter by "documents" API calls
4. ✅ Should see only **1 request** to `getAllDocumentsMetadata`

### Before vs After

**Before Optimization:**
- ❌ 2 requests to `getAllDocumentsMetadata`
- Sidebar: `includeDeleted=true`
- Dashboard: `includeDeleted=false`

**After Optimization:**
- ✅ 1 request to `getAllDocumentsMetadata`
- Both: `includeDeleted=true`
- Dashboard filters deleted documents client-side

## Related Files
- `lib/swr/keys.ts` - Cache key generators
- `lib/swr/fetchers.ts` - SWR fetcher functions
- `lib/swr/config.ts` - Global SWR configuration
- `hooks/swr/useDocuments.ts` - Document data fetching hooks
- `hooks/swr/index.ts` - Barrel exports
