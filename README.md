<div align="center">

# Mosaic

**Your AI-powered workspace for capturing, organizing, and refining ideas.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-F02E65?style=flat-square&logo=appwrite)](https://appwrite.io/)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Environment Variables](#environment-variables) • [Project Structure](#project-structure)

</div>

---

## Overview

Mosaic is a modern, AI-powered note-taking and document management application. Built with Next.js 16 and powered by Appwrite, it provides a seamless writing experience with an intuitive Notion-style block editor and intelligent AI assistance.

![Mosaic Preview](https://via.placeholder.com/1200x600/0a0a0a/ffffff?text=Mosaic+Preview)

## Features

### ✍️ Block Editor
- Notion-style block editor powered by [BlockNote](https://www.blocknotejs.com/)
- Drag-and-drop content organization
- Rich text formatting and media embeds
- Custom slash commands

### 🤖 AI-Powered Writing
- **Draft** - Generate content from prompts with customizable tone and length
- **Improve** - Enhance clarity, grammar, and flow of selected text
- **Summarize** - Condense lengthy content into key points
- **Chat** - Conversational AI assistant for your documents
- Powered by OpenRouter (Claude 3.5 Sonnet, Gemini 2.5 Flash)

### 🔍 Semantic Search
- AI-powered search using vector embeddings (optional)
- Qdrant integration for similarity search
- Find documents by meaning, not just keywords

### 📁 Workspace Management
- Create multiple workspaces for different contexts
- Organize documents with favorites and trash
- Quick search and filtering

### 🔐 Authentication
- Email/password signup and login
- Google OAuth integration
- Email verification support
- Session management

### 📱 Progressive Web App
- Install as a native app on any device
- Offline-capable with IndexedDB caching
- Mobile-first responsive design

### 🎨 Customization
- Dark and light theme support
- Customizable document fonts
- User preferences persistence

### 📤 Export Options
- Export documents to PDF
- Export to Markdown format

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Editor** | BlockNote |
| **Backend** | Appwrite Cloud |
| **AI** | OpenRouter API |
| **Search** | Qdrant (optional) |
| **State** | Zustand |
| **Data Fetching** | SWR |
| **UI Components** | Radix UI, Lucide Icons |
| **PWA** | next-pwa |

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Appwrite Cloud account (or self-hosted instance)
- OpenRouter API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mosaic.git
   cd mosaic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your environment variables (see [Environment Variables](#environment-variables))

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DOCUMENTS_TABLE_ID` | Documents table ID |
| `NEXT_PUBLIC_APPWRITE_WORKSPACES_TABLE_ID` | Workspaces table ID |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ENABLE_COLLABORATION` | Enable real-time collaboration (default: false) |
| `NEXT_PUBLIC_ENABLE_CLOUD_SYNC` | Enable cloud sync (default: false) |
| `QDRANT_URL` | Qdrant instance for semantic search |
| `QDRANT_API_KEY` | Qdrant API key |

### Appwrite Setup

1. Create a project at [cloud.appwrite.io](https://cloud.appwrite.io)
2. Create database tables:
   - `documents` - User documents
   - `workspaces` - Workspace data
   - `users` - User profiles
3. Create storage buckets:
   - `avatars` - User avatars
   - `document-images` - Document images
4. Enable Google OAuth in Authentication settings

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── api/               # API routes
│   ├── auth/              # OAuth callbacks
│   ├── dashboard/         # Main application
│   └── page.tsx           # Landing page
├── components/
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard UI
│   ├── editor/            # BlockNote editor components
│   ├── export/            # Export functionality
│   ├── landing/           # Landing page sections
│   ├── layout/            # Layout components
│   ├── settings/          # Settings pages
│   └── ui/                # Reusable UI primitives
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/
│   ├── ai/                # AI task definitions & OpenRouter client
│   ├── appwrite/          # Appwrite service modules
│   ├── db/                # Database types and operations
│   ├── editor/            # Editor utilities
│   ├── export/            # PDF and Markdown exporters
│   └── swr/               # SWR configuration and fetchers
└── public/                # Static assets
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Roadmap

- [x] AI-powered writing assistant
- [x] Block editor with BlockNote
- [x] Workspace management
- [ ] Real-time collaboration (in progress, flag-controlled)
- [ ] Document sharing and permissions
- [ ] Semantic search improvements
- [ ] Mobile app (React Native)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using Next.js, Appwrite, and AI

</div>
