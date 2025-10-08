# Product Requirements Document (PRD)
## Collaborative Block-Based Document Editor

**Version:** 2.0  
**Date:** January 2025  
**Last Updated:** January 2025  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Development Philosophy](#development-philosophy)
4. [Tech Stack Overview](#tech-stack-overview)
5. [Phase 1: Local-First MVP](#phase-1-local-first-mvp)
6. [Phase 2: Cloud Integration](#phase-2-cloud-integration)
7. [Technical Architecture](#technical-architecture)
8. [User Stories](#user-stories)
9. [Success Metrics](#success-metrics)
10. [Appendix](#appendix)

---

## Executive Summary

Building a modern, collaborative block-based document editor inspired by Notion/Wisk using **Next.js 14** with a **two-phased approach**:

- **Phase 1:** Complete, functional editor with local storage (IndexedDB) - fully usable offline
- **Phase 2:** Add Appwrite backend for cloud sync, real-time collaboration, and multi-device access

### Why Two Phases?

✅ **Validate core features** without backend complexity  
✅ **Faster time to working product** (4 weeks vs 16 weeks)  
✅ **Learn user needs** before investing in infrastructure  
✅ **Offline-first architecture** from day one  
✅ **Easier testing** of editor functionality  
✅ **Progressive enhancement** - each phase adds value

---

## Product Vision

### Problem Statement

Users need a powerful document editor that:
- Works offline and online seamlessly
- Supports rich content (images, code, tables, embeds)
- Provides collaborative features when needed
- Doesn't lock them into proprietary platforms
- Performs fast on any device

### Solution

A **modern, block-based editor** that:
1. **Phase 1:** Works entirely in the browser with local storage
2. **Phase 2:** Optionally syncs to cloud for collaboration and multi-device access

### Target Users

1. **Solo Users** - Personal notes, journaling, documentation
2. **Students** - Study notes, research papers
3. **Developers** - Technical docs, API documentation
4. **Teams** - (Phase 2) Collaborative workspaces
5. **Content Creators** - Blog posts, articles

---

## Development Philosophy

### Offline-First Principles

```
Local Storage → Cloud Sync (Optional Enhancement)
```

**NOT:**
```
Cloud Required → Offline as fallback
```

### Progressive Enhancement

- **Phase 1:** Fully functional standalone app
- **Phase 2:** Enhanced with cloud features
- Users choose when to enable cloud sync

---

## Tech Stack Overview

### Core Stack (Both Phases)

```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS + shadcn/ui",
  "editor": "BlockNote (ProseMirror-based)",
  "state": "Zustand",
  "database": "IndexedDB (via idb)",
  "pwa": "next-pwa"
}
```

### Phase 2 Additions

```json
{
  "backend": "Appwrite",
  "collaboration": "Yjs (CRDT)",
  "realtime": "Appwrite Realtime",
  "storage": "Appwrite Storage",
  "auth": "Appwrite Auth"
}
```

---

## PHASE 1: Local-First MVP

### 🎯 Goal
Build a **complete, production-ready document editor** that works entirely offline using browser storage.

### Timeline: 4 Weeks

---

### Week 1: Foundation & Setup

#### Objectives
- Project scaffolding
- Basic UI layout
- Document list view

#### Tasks

**1.1 Project Setup**
```bash
# Initialize Next.js with TypeScript
npx create-next-app@latest collaborative-editor --typescript --tailwind --app

# Install core dependencies
npm install @blocknote/core @blocknote/react @blocknote/mantine
npm install zustand idb
npm install @radix-ui/react-* lucide-react
npm install date-fns nanoid
```

**1.2 Project Structure**
```
collaborative-editor/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home/document list
│   ├── documents/
│   │   └── [id]/
│   │       └── page.tsx        # Editor page
│   └── globals.css
├── components/
│   ├── editor/
│   │   ├── BlockEditor.tsx     # Main editor
│   │   ├── EditorToolbar.tsx   # Formatting toolbar
│   │   └── EditorSkeleton.tsx  # Loading state
│   ├── sidebar/
│   │   ├── Sidebar.tsx         # Document list sidebar
│   │   ├── DocumentItem.tsx    # Single document item
│   │   └── SearchBar.tsx       # Search documents
│   ├── ui/                     # shadcn components
│   └── Layout.tsx              # App layout
├── lib/
│   ├── db/
│   │   ├── index.ts            # IndexedDB setup
│   │   ├── documents.ts        # Document operations
│   │   └── types.ts            # TypeScript types
│   ├── editor/
│   │   ├── schema.ts           # BlockNote schema
│   │   └── utils.ts            # Editor utilities
│   └── utils.ts
├── hooks/
│   ├── useDocument.ts          # Document CRUD
│   ├── useDocuments.ts         # List documents
│   ├── useAutoSave.ts          # Auto-save logic
│   └── useLocalStorage.ts      # localStorage wrapper
├── store/
│   └── editor-store.ts         # Zustand store
└── types/
    └── index.ts                # Global types
```

**1.3 IndexedDB Setup**

```typescript
// lib/db/index.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface EditorDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: { 'by-updated': Date; 'by-created': Date };
  };
  settings: {
    key: string;
    value: any;
  };
}

interface Document {
  id: string;
  title: string;
  content: string; // JSON string of BlockNote content
  icon?: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  parentId?: string;
}

let dbInstance: IDBPDatabase<EditorDB> | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EditorDB>('editor-db', 1, {
    upgrade(db) {
      // Documents store
      const docStore = db.createObjectStore('documents', { 
        keyPath: 'id' 
      });
      docStore.createIndex('by-updated', 'updatedAt');
      docStore.createIndex('by-created', 'createdAt');

      // Settings store
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });

  return dbInstance;
}
```

**1.4 Document Operations**

```typescript
// lib/db/documents.ts
import { nanoid } from 'nanoid';
import { getDB } from './index';
import type { Document } from './types';

export async function createDocument(
  title: string = 'Untitled'
): Promise<Document> {
  const db = await getDB();
  
  const doc: Document = {
    id: nanoid(),
    title,
    content: JSON.stringify([{ type: 'paragraph', content: '' }]),
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };

  await db.add('documents', doc);
  return doc;
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDB();
  return db.get('documents', id);
}

export async function updateDocument(
  id: string,
  updates: Partial<Document>
): Promise<void> {
  const db = await getDB();
  const doc = await db.get('documents', id);
  
  if (!doc) throw new Error('Document not found');

  const updated = {
    ...doc,
    ...updates,
    updatedAt: new Date(),
  };

  await db.put('documents', updated);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await updateDocument(id, { isDeleted: true });
}

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('documents', 'by-updated');
  return all.filter(doc => !doc.isDeleted).reverse();
}

export async function searchDocuments(query: string): Promise<Document[]> {
  const all = await getAllDocuments();
  const lowerQuery = query.toLowerCase();
  
  return all.filter(doc => 
    doc.title.toLowerCase().includes(lowerQuery) ||
    doc.content.toLowerCase().includes(lowerQuery)
  );
}
```

**1.5 Basic UI Components**

```typescript
// app/page.tsx - Home page with document list
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllDocuments, createDocument } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const docs = await getAllDocuments();
    setDocuments(docs);
    setLoading(false);
  }

  async function handleCreateDocument() {
    const doc = await createDocument();
    router.push(`/documents/${doc.id}`);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Documents</h1>
        <Button onClick={handleCreateDocument}>
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.map(doc => (
          <DocumentCard 
            key={doc.id} 
            document={doc}
            onClick={() => router.push(`/documents/${doc.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Deliverable Week 1:**
- ✅ Working document list
- ✅ Create new documents
- ✅ IndexedDB persistence
- ✅ Basic navigation

---

### Week 2: Block Editor Integration

#### Objectives
- Integrate BlockNote editor
- Implement auto-save
- Add formatting toolbar

#### Tasks

**2.1 Editor Component**

```typescript
// components/editor/BlockEditor.tsx
'use client';

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCallback, useEffect } from 'react';

interface BlockEditorProps {
  documentId: string;
  initialContent?: string;
  onSave: (content: string) => void;
}

export function BlockEditor({ 
  documentId, 
  initialContent,
  onSave 
}: BlockEditorProps) {
  
  const editor = useCreateBlockNote({
    initialContent: initialContent 
      ? JSON.parse(initialContent) 
      : undefined,
  });

  const handleChange = useCallback(() => {
    const content = JSON.stringify(editor.document);
    onSave(content);
  }, [editor, onSave]);

  useEffect(() => {
    // Listen to editor changes
    editor.onChange(handleChange);
  }, [editor, handleChange]);

  return (
    <div className="editor-wrapper">
      <BlockNoteView 
        editor={editor}
        theme="light"
      />
    </div>
  );
}
```

**2.2 Auto-Save Hook**

```typescript
// hooks/useAutoSave.ts
import { useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface UseAutoSaveOptions {
  delay?: number;
  onSave: (content: string) => Promise<void>;
}

export function useAutoSave({ 
  delay = 2000, 
  onSave 
}: UseAutoSaveOptions) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const debouncedSave = useDebouncedCallback(
    async (content: string) => {
      setSaving(true);
      try {
        await onSave(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Save failed:', error);
      } finally {
        setSaving(false);
      }
    },
    delay
  );

  return {
    save: debouncedSave,
    saving,
    lastSaved,
  };
}
```

**2.3 Editor Page**

```typescript
// app/documents/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { getDocument, updateDocument } from '@/lib/db/documents';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { Document } from '@/lib/db/types';

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  const { save, saving, lastSaved } = useAutoSave({
    onSave: async (content) => {
      await updateDocument(documentId, { content });
    },
  });

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  async function loadDocument() {
    const doc = await getDocument(documentId);
    if (doc) {
      setDocument(doc);
    }
    setLoading(false);
  }

  async function handleTitleChange(title: string) {
    await updateDocument(documentId, { title });
    setDocument(prev => prev ? { ...prev, title } : null);
  }

  if (loading) return <div>Loading...</div>;
  if (!document) return <div>Document not found</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex justify-between items-center">
        <input
          type="text"
          value={document.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-2xl font-bold border-none outline-none"
          placeholder="Untitled"
        />
        <div className="text-sm text-gray-500">
          {saving ? 'Saving...' : lastSaved ? `Saved ${formatDate(lastSaved)}` : ''}
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-8">
        <BlockEditor
          documentId={documentId}
          initialContent={document.content}
          onSave={save}
        />
      </div>
    </div>
  );
}
```

**Deliverable Week 2:**
- ✅ Working BlockNote editor
- ✅ Auto-save with debouncing
- ✅ Title editing
- ✅ Save status indicators

---

### Week 3: Rich Content & Features

#### Objectives
- Add rich block types
- Image upload (base64 in IndexedDB)
- Search functionality
- Keyboard shortcuts

#### Tasks

**3.1 Custom Block Schema**

```typescript
// lib/editor/schema.ts
import { defaultBlockSpecs } from "@blocknote/core";

export const customSchema = {
  ...defaultBlockSpecs,
  // Add custom blocks here
};
```

**3.2 Image Upload (Local)**

```typescript
// lib/editor/image-upload.ts

export async function uploadImageToIndexedDB(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result as string;
      // Store in IndexedDB or return base64 directly
      resolve(base64);
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// In BlockNote editor config
const editor = useCreateBlockNote({
  uploadFile: async (file: File) => {
    const url = await uploadImageToIndexedDB(file);
    return url;
  },
});
```

**3.3 Document Search**

```typescript
// components/sidebar/SearchBar.tsx
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { searchDocuments } from '@/lib/db/documents';
import type { Document } from '@/lib/db/types';

export function SearchBar({ onResultClick }: { 
  onResultClick: (doc: Document) => void 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.length > 2) {
      const docs = await searchDocuments(value);
      setResults(docs);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-auto z-10">
          {results.map(doc => (
            <button
              key={doc.id}
              onClick={() => {
                onResultClick(doc);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              <div className="font-medium">{doc.title}</div>
              <div className="text-sm text-gray-500 truncate">
                {doc.content.slice(0, 100)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**3.4 Keyboard Shortcuts**

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Open search
      }

      // Cmd/Ctrl + N: New document
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewDocument();
      }

      // Cmd/Ctrl + S: Save (already auto-saved, show feedback)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Show "Saved" toast
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

**Deliverable Week 3:**
- ✅ Image upload (base64)
- ✅ Search functionality
- ✅ Keyboard shortcuts
- ✅ Rich content blocks

---

### Week 4: Polish & PWA

#### Objectives
- Export to Markdown/PDF
- PWA support
- Nested pages
- Dark mode

#### Tasks

**4.1 Export Functions**

```typescript
// lib/export/markdown.ts
import { Block } from "@blocknote/core";

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(blockToMarkdown).join('\n\n');
}

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading':
      const level = '#'.repeat(block.props.level || 1);
      return `${level} ${block.content}`;
    
    case 'paragraph':
      return block.content || '';
    
    case 'bulletListItem':
      return `- ${block.content}`;
    
    case 'numberedListItem':
      return `1. ${block.content}`;
    
    case 'codeBlock':
      return `\`\`\`${block.props.language}\n${block.content}\n\`\`\``;
    
    default:
      return block.content || '';
  }
}

// Usage
export async function exportDocumentAsMarkdown(documentId: string) {
  const doc = await getDocument(documentId);
  if (!doc) return;

  const blocks = JSON.parse(doc.content);
  const markdown = blocksToMarkdown(blocks);

  // Download file
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**4.2 PWA Configuration**

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // your next config
});
```

```json
// public/manifest.json
{
  "name": "Collaborative Editor",
  "short_name": "Editor",
  "description": "Offline-first document editor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**4.3 Nested Pages**

```typescript
// lib/db/documents.ts - Add hierarchy support

export async function getDocumentTree(): Promise<DocumentNode[]> {
  const all = await getAllDocuments();
  const rootDocs = all.filter(doc => !doc.parentId);
  
  return rootDocs.map(doc => buildTree(doc, all));
}

function buildTree(doc: Document, allDocs: Document[]): DocumentNode {
  const children = allDocs
    .filter(d => d.parentId === doc.id)
    .map(child => buildTree(child, allDocs));

  return {
    ...doc,
    children,
  };
}
```

**4.4 Dark Mode**

```typescript
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  );
}
```

**Deliverable Week 4:**
- ✅ Export to Markdown
- ✅ PWA installable
- ✅ Nested page structure
- ✅ Dark mode support
- ✅ **Phase 1 Complete!**

---

### Phase 1 Feature Summary

#### Core Features ✅
- ✅ Block-based rich text editor (BlockNote)
- ✅ Auto-save (2-second debounce)
- ✅ Document management (CRUD)
- ✅ Full-text search
- ✅ Nested pages/hierarchy
- ✅ Image uploads (base64)
- ✅ Code blocks with syntax highlighting
- ✅ Tables, lists, headings, quotes
- ✅ Export to Markdown
- ✅ Keyboard shortcuts
- ✅ Dark mode
- ✅ PWA (works offline, installable)
- ✅ Mobile responsive

#### Data Storage
- **All data in IndexedDB** (browser storage)
- **Images as base64** strings
- **No backend required**
- **Works completely offline**

#### User Experience
- **Instant load** (no network calls)
- **Fast editing** (local-first)
- **No login required**
- **Privacy-focused** (data never leaves device)

---

## PHASE 2: Cloud Integration (Appwrite)

### 🎯 Goal
Add **optional cloud sync** and **real-time collaboration** while maintaining offline-first architecture.

### Timeline: 8-12 Weeks

---

### Phase 2 Overview

**Key Principle:** *Enhance, don't replace*

- Phase 1 features continue to work offline
- Cloud sync is **opt-in**
- Graceful degradation when offline
- Conflict resolution for sync conflicts

---

### Week 5-6: Appwrite Setup & Authentication

#### Objectives
- Setup Appwrite project
- Add authentication UI
- User sessions

#### Tasks

**5.1 Appwrite Configuration**

```typescript
// lib/appwrite/config.ts
import { Client, Databases, Storage, Account, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);
export const functions = new Functions(client);

export { client };

// Environment variables needed
// NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
// NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
```

**5.2 Database Schema (Appwrite)**

```typescript
// Appwrite Console > Database > Create Collection

// Collection: documents
{
  "$id": "documents",
  "attributes": [
    { "key": "userId", "type": "string", "required": true, "array": false },
    { "key": "title", "type": "string", "required": true, "size": 255 },
    { "key": "content", "type": "string", "required": true, "size": 1000000 },
    { "key": "icon", "type": "string", "required": false },
    { "key": "coverImage", "type": "string", "required": false },
    { "key": "isPublic", "type": "boolean", "required": true, "default": false },
    { "key": "isDeleted", "type": "boolean", "required": true, "default": false },
    { "key": "parentId", "type": "string", "required": false }
  ],
  "indexes": [
    { "key": "userId", "type": "key", "attributes": ["userId"] },
    { "key": "updatedAt", "type": "key", "attributes": ["$updatedAt"] }
  ],
  "permissions": [
    "create(\"users\")",
    "read(\"user:{userId}\")",
    "update(\"user:{userId}\")",
    "delete(\"user:{userId}\")"
  ]
}
```

**5.3 Authentication Component**

```typescript
// components/auth/AuthModal.tsx
'use client';

import { useState } from 'react';
import { account } from '@/lib/appwrite/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AuthModal({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (isLogin) {
        await account.createEmailPasswordSession(email, password);
      } else {
        await account.create('unique()', email, password);
        await account.createEmailPasswordSession(email, password);
      }
      onSuccess();
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-4 text-sm text-gray-600"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
```

**5.4 User Session Management**

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { account } from '@/lib/appwrite/config';
import type { Models } from 'appwrite';

export function useAuth() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const session = await account.get();
      setUser(session);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await account.deleteSession('current');
    setUser(null);
  }

  return { user, loading, logout };
}
```

**Deliverable Week 5-6:**
- ✅ Appwrite project configured
- ✅ Authentication UI
- ✅ User sessions
- ✅ Protected routes

---

### Week 7-8: Cloud Sync Implementation

#### Objectives
- Sync local documents to cloud
- Download documents from cloud
- Bi-directional sync

#### Tasks

**7.1 Sync Service**

```typescript
// lib/sync/sync-service.ts
import { databases } from '@/lib/appwrite/config';
import * as localDB from '@/lib/db/documents';
import { ID } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const DOCUMENTS_COLLECTION = 'documents';

export class SyncService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Upload local document to cloud
  async uploadDocument(localDoc: LocalDocument) {
    try {
      const cloudDoc = await databases.createDocument(
        DATABASE_ID,
        DOCUMENTS_COLLECTION,
        localDoc.id,
        {
          userId: this.userId,
          title: localDoc.title,
          content: localDoc.content,
          icon: localDoc.icon,
          coverImage: localDoc.coverImage,
          parentId: localDoc.parentId,
          isPublic: false,
          isDeleted: localDoc.isDeleted,
        }
      );

      // Mark as synced in local DB
      await localDB.updateDocument(localDoc.id, {
        cloudSynced: true,
        cloudUpdatedAt: new Date(cloudDoc.$updatedAt),
      });

      return cloudDoc;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // Download document from cloud
  async downloadDocument(documentId: string) {
    const cloudDoc = await databases.getDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION,
      documentId
    );

    // Save to local DB
    await localDB.updateDocument(documentId, {
      title: cloudDoc.title,
      content: cloudDoc.content,
      icon: cloudDoc.icon,
      coverImage: cloudDoc.coverImage,
      parentId: cloudDoc.parentId,
      isDeleted: cloudDoc.isDeleted,
      cloudSynced: true,
      cloudUpdatedAt: new Date(cloudDoc.$updatedAt),
    });
  }

  // Sync all documents
  async syncAll() {
    // 1. Upload local-only documents
    const localDocs = await localDB.getAllDocuments();
    const unsyncedDocs = localDocs.filter(doc => !doc.cloudSynced);

    for (const doc of unsyncedDocs) {
      await this.uploadDocument(doc);
    }

    // 2. Download cloud documents
    const cloudDocs = await databases.listDocuments(
      DATABASE_ID,
      DOCUMENTS_COLLECTION
    );

    for (const cloudDoc of cloudDocs.documents) {
      const localDoc = await localDB.getDocument(cloudDoc.$id);
      
      if (!localDoc) {
        // New document from cloud
        await this.downloadDocument(cloudDoc.$id);
      } else {
        // Resolve conflicts
        await this.resolveConflict(localDoc, cloudDoc);
      }
    }
  }

  // Simple conflict resolution: last-write-wins
  async resolveConflict(localDoc: any, cloudDoc: any) {
    const localUpdated = new Date(localDoc.updatedAt);
    const cloudUpdated = new Date(cloudDoc.$updatedAt);

    if (cloudUpdated > localUpdated) {
      // Cloud is newer, download
      await this.downloadDocument(cloudDoc.$id);
    } else if (localUpdated > cloudUpdated) {
      // Local is newer, upload
      await this.uploadDocument(localDoc);
    }
    // If equal, no action needed
  }
}
```

**7.2 Sync UI Component**

```typescript
// components/sync/SyncButton.tsx
'use client';

import { useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncService } from '@/lib/sync/sync-service';
import { useAuth } from '@/hooks/useAuth';

export function SyncButton() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  async function handleSync() {
    if (!user) return;

    setSyncing(true);
    try {
      const sync = new SyncService(user.$id);
      await sync.syncAll();
      setLastSync(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button 
      onClick={handleSync} 
      disabled={syncing || !user}
      variant="outline"
      size="sm"
    >
      {syncing ? (
        <Cloud className="w-4 h-4 mr-2 animate-pulse" />
      ) : user ? (
        <Cloud className="w-4 h-4 mr-2" />
      ) : (
        <CloudOff className="w-4 h-4 mr-2" />
      )}
      {syncing ? 'Syncing...' : lastSync ? `Synced ${formatTime(lastSync)}` : 'Sync'}
    </Button>
  );
}
```

**7.3 Auto-Sync Background**

```typescript
// hooks/useAutoSync.ts
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { SyncService } from '@/lib/sync/sync-service';

export function useAutoSync(intervalMs: number = 60000) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const sync = new SyncService(user.$id);
    
    // Initial sync
    sync.syncAll();

    // Periodic sync
    const interval = setInterval(() => {
      sync.syncAll();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [user, intervalMs]);
}
```

**Deliverable Week 7-8:**
- ✅ Upload local documents to cloud
- ✅ Download cloud documents
- ✅ Bi-directional sync
- ✅ Basic conflict resolution
- ✅ Auto-sync in background

---

### Week 9-10: Real-time Collaboration (Yjs)

#### Objectives
- Multiple users editing simultaneously
- CRDT-based conflict resolution
- User presence

#### Tasks

**9.1 Yjs Setup**

```bash
npm install yjs y-protocols
```

**9.2 Appwrite Realtime Provider for Yjs**

```typescript
// lib/collaboration/appwrite-provider.ts
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { client, databases } from '@/lib/appwrite/config';

export class AppwriteProvider {
  private doc: Y.Doc;
  private awareness: Awareness;
  private documentId: string;
  private unsubscribe?: () => void;

  constructor(doc: Y.Doc, documentId: string, awareness: Awareness) {
    this.doc = doc;
    this.documentId = documentId;
    this.awareness = awareness;
    
    this.connect();
  }

  private connect() {
    // Subscribe to Appwrite Realtime
    this.unsubscribe = client.subscribe(
      `databases.*.collections.*.documents.${this.documentId}`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.update')) {
          this.handleRemoteUpdate(response.payload);
        }
      }
    );

    // Listen to local changes
    this.doc.on('update', this.handleLocalUpdate);
    
    // Setup awareness
    this.awareness.on('change', this.handleAwarenessChange);
  }

  private handleLocalUpdate = async (update: Uint8Array, origin: any) => {
    if (origin === this) return; // Ignore own updates

    // Convert Yjs update to base64 for storage
    const updateBase64 = btoa(String.fromCharCode(...update));

    try {
      await databases.updateDocument(
        DATABASE_ID,
        DOCUMENTS_COLLECTION,
        this.documentId,
        {
          content: JSON.stringify(this.doc.toJSON()),
          yjsUpdate: updateBase64, // Store latest update
        }
      );
    } catch (error) {
      console.error('Failed to save update:', error);
    }
  };

  private handleRemoteUpdate(payload: any) {
    if (!payload.yjsUpdate) return;

    // Apply remote update to local doc
    const updateArray = Uint8Array.from(atob(payload.yjsUpdate), c => c.charCodeAt(0));
    Y.applyUpdate(this.doc, updateArray, this);
  }

  private handleAwarenessChange = () => {
    // Broadcast awareness state (cursor position, user info)
    const states = Array.from(this.awareness.getStates().entries());
    // Send to Appwrite or handle via WebSocket
  };

  destroy() {
    this.unsubscribe?.();
    this.doc.off('update', this.handleLocalUpdate);
    this.awareness.off('change', this.handleAwarenessChange);
  }
}
```

**9.3 Collaborative Editor Component**

```typescript
// components/editor/CollaborativeEditor.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { AppwriteProvider } from '@/lib/collaboration/appwrite-provider';
import { useAuth } from '@/hooks/useAuth';

export function CollaborativeEditor({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Create Yjs document
  const ydoc = useMemo(() => new Y.Doc(), []);
  
  // Create awareness for presence
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc]);

  // Setup Appwrite provider
  const provider = useMemo(() => {
    if (!user) return null;
    return new AppwriteProvider(ydoc, documentId, awareness);
  }, [ydoc, documentId, user]);

  // Set user info in awareness
  useEffect(() => {
    if (user) {
      awareness.setLocalStateField('user', {
        name: user.name,
        color: getRandomColor(),
      });
    }
  }, [user, awareness]);

  const editor = useCreateBlockNote({
    collaboration: user ? {
      provider,
      fragment: ydoc.getXmlFragment("document-store"),
      user: {
        name: user.name,
        color: getRandomColor(),
      },
    } : undefined,
  });

  useEffect(() => {
    setIsReady(true);
    return () => provider?.destroy();
  }, []);

  if (!isReady) return <div>Loading...</div>;

  return (
    <div>
      {user && <UserPresence awareness={awareness} />}
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}
```

**9.4 User Presence Component**

```typescript
// components/collaboration/UserPresence.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

interface User {
  name: string;
  color: string;
}

export function UserPresence({ awareness }: { awareness: Awareness }) {
  const [users, setUsers] = useState<Map<number, User>>(new Map());

  useEffect(() => {
    function handleChange() {
      const states = awareness.getStates();
      const activeUsers = new Map<number, User>();

      states.forEach((state, clientId) => {
        if (state.user) {
          activeUsers.set(clientId, state.user);
        }
      });

      setUsers(activeUsers);
    }

    awareness.on('change', handleChange);
    handleChange();

    return () => awareness.off('change', handleChange);
  }, [awareness]);

  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <span className="text-sm text-gray-600">
        {users.size} {users.size === 1 ? 'user' : 'users'} online
      </span>
      <div className="flex -space-x-2">
        {Array.from(users.values()).map((user, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name[0].toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Deliverable Week 9-10:**
- ✅ Real-time collaborative editing
- ✅ CRDT-based conflict resolution
- ✅ User presence indicators
- ✅ Multiple cursors

---

### Week 11-12: Cloud Storage & Advanced Features

#### Objectives
- Image upload to Appwrite Storage
- File attachments
- Comments system
- Sharing & permissions

#### Tasks

**11.1 Image Upload to Cloud**

```typescript
// lib/storage/images.ts
import { storage } from '@/lib/appwrite/config';
import { ID } from 'appwrite';

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_IMAGES_BUCKET!;

export async function uploadImage(file: File): Promise<string> {
  try {
    // Upload to Appwrite Storage
    const response = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      file
    );

    // Get preview URL (optimized)
    const url = storage.getFilePreview(
      BUCKET_ID,
      response.$id,
      800,  // width
      0,    // height (auto)
      'webp',
      85    // quality
    );

    return url.href;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
}

// Use in BlockNote editor
const editor = useCreateBlockNote({
  uploadFile: async (file: File) => {
    if (user) {
      // Upload to cloud
      return await uploadImage(file);
    } else {
      // Fallback to base64 for offline
      return await uploadImageToIndexedDB(file);
    }
  },
});
```

**11.2 Comments System**

```typescript
// Appwrite Collection: comments
{
  "$id": "comments",
  "attributes": [
    { "key": "documentId", "type": "string", "required": true },
    { "key": "userId", "type": "string", "required": true },
    { "key": "content", "type": "string", "required": true, "size": 10000 },
    { "key": "blockId", "type": "string", "required": false },
    { "key": "resolved", "type": "boolean", "required": true, "default": false }
  ]
}
```

```typescript
// components/collaboration/Comments.tsx
import { databases } from '@/lib/appwrite/config';
import { useAuth } from '@/hooks/useAuth';

export function CommentThread({ documentId, blockId }: {
  documentId: string;
  blockId?: string;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  async function addComment() {
    await databases.createDocument(
      DATABASE_ID,
      'comments',
      ID.unique(),
      {
        documentId,
        userId: user!.$id,
        content: newComment,
        blockId,
        resolved: false,
      }
    );
    setNewComment('');
    loadComments();
  }

  // Implementation details...
}
```

**11.3 Document Sharing**

```typescript
// lib/sharing/permissions.ts
import { databases } from '@/lib/appwrite/config';
import { Permission, Role } from 'appwrite';

export async function shareDocument(
  documentId: string,
  userEmail: string,
  role: 'viewer' | 'editor'
) {
  // Get user by email
  // Add to document permissions
  
  const permissions = [
    Permission.read(Role.user(userId)),
  ];

  if (role === 'editor') {
    permissions.push(Permission.update(Role.user(userId)));
  }

  await databases.updateDocument(
    DATABASE_ID,
    DOCUMENTS_COLLECTION,
    documentId,
    {},
    permissions
  );
}
```

**Deliverable Week 11-12:**
- ✅ Cloud image storage
- ✅ File attachments
- ✅ Comments system
- ✅ Document sharing
- ✅ Permissions management

---

### Phase 2 Complete Feature Set

#### Cloud Features ✅
- ✅ User authentication (email/password, OAuth)
- ✅ Cloud document storage
- ✅ Bi-directional sync
- ✅ Real-time collaboration (Yjs + Appwrite)
- ✅ User presence & cursors
- ✅ Cloud image storage
- ✅ Comments & threads
- ✅ Document sharing
- ✅ Permissions (viewer/editor/owner)
- ✅ Multi-device access

#### Maintained from Phase 1
- ✅ Full offline functionality
- ✅ Local-first performance
- ✅ IndexedDB as primary storage
- ✅ PWA capabilities

---

## User Stories

### Phase 1 Stories

**Story 1: Solo User - Local Editing**
> As a user without an account, I want to create and edit documents that are saved locally, so I can use the editor without signing up.

**Acceptance Criteria:**
- Can create documents without login
- Auto-save to IndexedDB
- Works completely offline
- Data persists across browser sessions

---

**Story 2: Power User - Rich Content**
> As a content creator, I want to add images, code blocks, and tables to my documents, so I can create rich, formatted content.

**Acceptance Criteria:**
- Upload images via drag-and-drop
- Insert code blocks with syntax highlighting
- Create and edit tables
- All content saved locally

---

**Story 3: Privacy-Conscious User**
> As a privacy-focused user, I want all my data to stay on my device unless I choose to sync, so I maintain control over my information.

**Acceptance Criteria:**
- Default to local-only storage
- No automatic cloud sync
- Clear indication of sync status
- Can export data anytime

---

### Phase 2 Stories

**Story 4: Remote Worker - Multi-Device**
> As a remote worker, I want to access my documents from multiple devices, so I can work from anywhere.

**Acceptance Criteria:**
- Sign in with email
- Documents sync across devices
- Changes appear on all devices
- Works offline, syncs when online

---

**Story 5: Team Collaborator - Real-time Editing**
> As a team member, I want to edit documents simultaneously with colleagues, so we can collaborate in real-time like Google Docs.

**Acceptance Criteria:**
- See other users' cursors
- Changes appear instantly
- No merge conflicts
- User presence indicators

---

**Story 6: Project Manager - Sharing**
> As a project manager, I want to share documents with specific team members and control their permissions, so I can manage access appropriately.

**Acceptance Criteria:**
- Share via email
- Set view/edit permissions
- See who has access
- Revoke access anytime

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│              Browser (Client)               │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │         Next.js App                  │  │
│  │  ┌────────────┐    ┌──────────────┐ │  │
│  │  │ BlockNote  │    │   Zustand    │ │  │
│  │  │  Editor    │◄──►│    Store     │ │  │
│  │  └────────────┘    └──────────────┘ │  │
│  │         ▲                  ▲         │  │
│  │         │                  │         │  │
│  │         ▼                  ▼         │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │       IndexedDB (Primary)      │ │  │
│  │  │  - Documents                   │ │  │
│  │  │  - Images (base64)             │ │  │
│  │  │  - Settings                    │ │  │
│  │  └────────────────────────────────┘ │  │
│  │                                      │  │
│  │  Phase 2: Cloud Sync (Optional)     │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │    Appwrite SDK                │ │  │
│  │  │  - Auth                        │ │  │
│  │  │  - Database                    │ │  │
│  │  │  - Storage                     │ │  │
│  │  │  - Realtime (WebSocket)        │ │  │
│  │  └────────────────────────────────┘ │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     │
                     │ (Phase 2 Only)
                     ▼
┌─────────────────────────────────────────────┐
│          Appwrite Backend                   │
│  ┌──────────────────────────────────────┐  │
│  │  Database (MariaDB)                  │  │
│  │  Storage (S3-compatible)             │  │
│  │  Realtime (WebSocket)                │  │
│  │  Functions (AI, Export, etc.)        │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Data Flow

#### Phase 1: Local-Only
```
User Types → BlockNote Editor → Auto-save Hook → IndexedDB
                                          ↓
                                   Save Indicator
```

#### Phase 2: With Cloud Sync
```
User Types → BlockNote Editor → Yjs (CRDT) → Local + Cloud
                                     ↓             ↓
                                IndexedDB    Appwrite DB
                                     ↓             ↓
                                     └─── Sync ───┘
                                          ↓
                               Other Users' Editors
```

---

## Success Metrics

### Phase 1 Metrics

**Usage Metrics**
- Documents created per user
- Average document length
- Daily active usage
- Retention (D1, D7, D30)

**Performance Metrics**
- Time to Interactive: < 2s
- First Contentful Paint: < 1s
- Editor lag: < 16ms (60fps)
- Auto-save latency: < 100ms

**Quality Metrics**
- Zero data loss incidents
- Browser compatibility: 95%+
- Mobile responsiveness: 100%

### Phase 2 Metrics

**Collaboration Metrics**
- Documents with >1 collaborator
- Concurrent editors per document
- Comments per document
- Share rate

**Sync Metrics**
- Sync success rate: > 99%
- Sync latency: < 2s
- Conflict resolution success: > 95%
- Offline → Online sync success: > 99%

**Engagement Metrics**
- Multi-device usage rate
- Cloud vs local-only users
- Average team size
- Document sharing frequency

---

## Appendix

### A. Complete Dependencies

```json
{
  "name": "collaborative-editor",
  "version": "0.1.0",
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    
    "@blocknote/core": "^0.15.0",
    "@blocknote/react": "^0.15.0",
    "@blocknote/mantine": "^0.15.0",
    
    "idb": "^8.0.0",
    "nanoid": "^5.0.0",
    "date-fns": "^3.0.0",
    
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "lucide-react": "^0.400.0",
    "next-themes": "^0.3.0",
    
    "use-debounce": "^10.0.0",
    "nuqs": "^1.17.0",
    
    "next-pwa": "^5.6.0",
    
    "appwrite": "^14.0.0",
    "yjs": "^13.6.0",
    "y-protocols": "^1.0.6"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5",
    "eslint": "^8",
    "eslint-config-next": "14.2.0",
    "prettier": "^3.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### B. Environment Variables

```bash
# Phase 1 - None required (fully local)

# Phase 2 - Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=main
NEXT_PUBLIC_APPWRITE_IMAGES_BUCKET=images

# Optional - Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
```

### C. Browser Support

**Minimum Requirements:**
- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile Safari: 14+

**Required APIs:**
- IndexedDB (all modern browsers)
- Service Worker (for PWA)
- Web Crypto (for optional encryption)

### D. Deployment

#### Phase 1 Deployment
```bash
# Build and deploy to Vercel
npm run build
vercel deploy --prod

# Or Netlify
netlify deploy --prod

# Or any static host
# Build creates static files in .next/
```

#### Phase 2 Deployment

**Frontend:** Same as Phase 1

**Backend (Appwrite):**

Option 1: Appwrite Cloud
- Sign up at https://cloud.appwrite.io
- Create project
- Configure collections and buckets

Option 2: Self-Hosted
```bash
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.5.0
```

---

## Conclusion

This two-phased approach provides:

✅ **Phase 1: Immediate Value**
- Working editor in 4 weeks
- No backend complexity
- Privacy-focused
- Fast and reliable

✅ **Phase 2: Enhanced Capabilities**
- Optional cloud sync
- Real-time collaboration
- Multi-device access
- Team features

**Total Timeline:**
- Phase 1: 4 weeks (MVP)
- Phase 2: 8-12 weeks (Cloud features)
- Combined: 3-4 months to full feature parity

**Recommended Approach:**
1. Build Phase 1 completely
2. Launch and gather user feedback
3. Decide if Phase 2 is needed based on demand
4. Implement Phase 2 features incrementally

This ensures you always have a working product and can validate assumptions before major backend investment.

---

**Document Status:** Ready for Implementation  
**Last Updated:** January 2025  
**Version:** 2.0
