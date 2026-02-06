# Collaborative Editor - Local-First Notes App

A powerful, offline-first block-based document editor inspired by Notion, built with Next.js 15, TypeScript, and IndexedDB.

![Phase 1 Complete](https://img.shields.io/badge/Phase%201-Complete-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple)

## ✨ Features

### Core Functionality
- 📝 **Rich Text Editor** - Block-based editing with support for paragraphs, headings, lists, code blocks, tables, and images
- 💾 **Auto-Save** - Automatic saving with 2-second debounce, never lose your work
- 🔍 **Full-Text Search** - Search across all documents with content preview
- ⌨️ **Keyboard Shortcuts** - Quick actions with ⌘K (search) and ⌘N (new document)
- 📤 **Export to Markdown** - Export your documents with preserved formatting
- 🖼️ **Image Support** - Upload images up to 5MB (stored as base64)
- 🌓 **Dark Mode** - System, light, and dark themes with persistence
- 📱 **PWA Support** - Install on any device, works completely offline

### Technical Highlights
- **100% Local-First** - All data stored in browser's IndexedDB
- **Zero Backend Required** - Works without internet connection
- **Privacy-Focused** - Your data never leaves your device
- **Fast & Responsive** - Optimized with React 19 and Turbopack
- **Modern UI** - Built with Tailwind CSS and shadcn/ui

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd collaborative-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📖 Usage

### Creating Documents
- Click **"New Document"** button or press **⌘N**
- Start typing immediately - auto-save handles the rest
- Click the title to rename your document

### Searching Documents
- Click **"Search"** button or press **⌘K**
- Type to search across all document titles and content
- Click any result to open that document

### Rich Content
- **Format text**: Select text to see formatting options
- **Add images**: Drag & drop or use the image button
- **Code blocks**: Use `/code` or select from block menu
- **Tables**: Use `/table` or select from block menu
- **Lists**: Type `-` for bullets, `1.` for numbers

### Exporting
- Open any document
- Click the **⋮** menu in the top-right
- Select **"Export as Markdown"**
- File downloads automatically

### Dark Mode
- Click the **🌙/☀️** icon to toggle theme
- Supports system theme detection
- Theme preference is saved

## 🛠️ Tech Stack

### Core
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[React 19](https://react.dev/)** - UI library
- **[Turbopack](https://turbo.build/pack)** - Fast bundler

### Editor
- **[BlockNote](https://www.blocknotejs.org/)** - Block-based editor (ProseMirror)
- **[@blocknote/react](https://www.blocknotejs.org/)** - React bindings
- **[@blocknote/mantine](https://www.blocknotejs.org/)** - UI components

### Storage
- **[idb](https://github.com/jakearchibald/idb)** - IndexedDB wrapper
- **[nanoid](https://github.com/ai/nanoid)** - Unique ID generation

### UI
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable components
- **[Lucide React](https://lucide.dev/)** - Icon library
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme management

### Utilities
- **[date-fns](https://date-fns.org/)** - Date formatting
- **[use-debounce](https://github.com/xnimorz/use-debounce)** - Debounce hook

### PWA
- **[@ducanh2912/next-pwa](https://github.com/DuCanhGH/next-pwa)** - PWA support

## 📁 Project Structure

```
collaborative-editor/
├── app/
│   ├── page.tsx                    # Document list (home)
│   ├── documents/[id]/page.tsx    # Document editor
│   ├── layout.tsx                  # Root layout with theme provider
│   └── globals.css                 # Global styles
├── components/
│   ├── editor/
│   │   └── BlockEditor.tsx         # BlockNote wrapper with auto-save
│   ├── sidebar/
│   │   └── SearchBar.tsx           # Search component
│   ├── ui/                         # shadcn/ui components
│   ├── theme-provider.tsx          # Theme context provider
│   └── theme-toggle.tsx            # Dark mode toggle
├── lib/
│   ├── db/
│   │   ├── index.ts                # IndexedDB setup
│   │   ├── documents.ts            # Document CRUD operations
│   │   └── types.ts                # TypeScript types
│   ├── editor/
│   │   └── image-upload.ts         # Image handling
│   └── export/
│       └── markdown.ts             # Markdown export
├── public/
│   ├── manifest.json               # PWA manifest
│   └── icon.svg                    # App icon
└── package.json
```

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘N` / `Ctrl+N` | Create new document |
| `⌘K` / `Ctrl+K` | Open search |
| `⌘S` / `Ctrl+S` | Manual save (auto-save is always on) |

## 🗺️ Roadmap

### Phase 1 ✅ (Complete)
- [x] Core editor functionality
- [x] Document management
- [x] Search
- [x] Export to Markdown
- [x] Dark mode
- [x] PWA support

### Phase 2 (Future - Cloud Integration)
- [ ] Appwrite backend
- [ ] User authentication
- [ ] Cloud sync
- [ ] Real-time collaboration (Yjs)
- [ ] Document sharing
- [ ] Comments
- [ ] Cloud image storage
- [ ] Multi-device access

### Optional Enhancements
- [ ] Nested pages UI
- [ ] Document templates
- [ ] Tags and categories
- [ ] Trash/archive view
- [ ] PDF export
- [ ] Local backup/restore

## 🤝 Contributing

This project is currently in Phase 1 (local-only functionality). Contributions are welcome!

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Known Issues

1. **PWA Icons**: Placeholder SVG icon provided. Generate proper PNG icons (192x192 and 512x512) for full PWA support.
2. **Large Documents**: Very large documents (>10MB) may impact performance due to base64 image encoding.

## 💡 Tips

- **Performance**: Keep documents under 10MB for optimal performance
- **Images**: Compress images before uploading for better storage efficiency
- **Backup**: Export important documents regularly as Markdown files
- **Browser Storage**: IndexedDB data is tied to your browser profile

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js and BlockNote**

---

## ⚡ AI Draft (OpenRouter)

Quickly generate content inline with streaming draft preview.

Setup (.env.local):

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_SITE=http://localhost:3000
OPENROUTER_TITLE=Notes AI Draft
```

Model selection is server-locked in code (not environment-configured):
- Draft: `google/gemini-2.5-flash-lite`
- Title: `google/gemini-2.5-flash-lite-preview-09-2025`

How to use:
- In a document, click the toolbar button “AI Draft” (✨), or
- Click the “Generate with AI” chip that appears on an empty paragraph, or
- Open the document menu (⋮) → AI → Draft…, or
- Press Cmd+Shift+G / Ctrl+Shift+G.

The dialog streams the result; you can Stop, Regenerate, or Insert. Offline disables Generate. For full details, see `docs/AI_New_Content_Generation.md`.
