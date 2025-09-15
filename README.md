# Secondary Mind

AI-powered codebase analysis and development guidance tool built as a Tauri desktop application.

## Overview

Secondary Mind combines React/TypeScript frontend with Rust backend in a workspace architecture to provide intelligent code analysis, symbol exploration, and AI-assisted development guidance.

## Architecture

### Workspace Structure
```
├── core/           # Core functionality library (Rust)
├── desktop/        # Tauri desktop application (Rust + Tauri)
├── cli/            # Command-line interface (Rust)
├── src/            # React/TypeScript frontend
└── dist/           # Built application
```

### Tech Stack
- **Backend**: Rust, Tauri, Git2, SWC (AST parsing), Tokio
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, Zustand
- **Build**: Vite with Tauri integration

## Quick Start

### Prerequisites
- **Rust** (latest stable)
- **Node.js** 18+ and npm
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secondary
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   # Copy the environment template
   cp .env .env.local

   # Edit .env.local and add your API key
   # GEMINI_API_KEY=your_actual_api_key_here
   ```

### Development

**Frontend development** (hot reload, no Tauri)
```bash
npm run dev
```

**Full Tauri development** (frontend + backend)
```bash
npm run tauri:dev
```

### Production Build

**Release executable**
```bash
npm run tauri:build
```
Builds the desktop application in `desktop/target/release/`

**Web deployment** (demo mode)
```bash
npm run build:demo  # Builds for GitHub Pages
npm run deploy      # Deploys to GitHub Pages
```

## Environment Configuration

### Development (.env)
Used during `npm run tauri:dev` and local development:
```bash
# Required for AI features
GEMINI_API_KEY=your_api_key_here
```

### Production (.exe)
Built releases read environment variables from system environment or runtime context. Set globally:

**Windows:**
```cmd
setx GEMINI_API_KEY "your_api_key_here"
```

**macOS/Linux:**
```bash
export GEMINI_API_KEY="your_api_key_here"
```

### Demo Mode (.env.demo)
Used for web deployment without backend features:
```bash
VITE_MODE=demo
VITE_DEMO_MODE=true
```

## Key Features

### 🎯 Development Profiles
- Create context-aware development profiles
- Export to JSON, YAML, XML with file contents
- Intelligent context collection for AI assistance

### 🔍 Symbol Analysis
- TypeScript/JavaScript and Rust AST parsing
- Interactive symbol explorer
- Dependency mapping and code navigation

### 🤖 AI Integration
- Context-aware code guidance using Gemini API
- Profile-based context injection
- Chat interface for development assistance

### 📁 Project Management
- Git integration and status tracking
- Recent projects with quick access
- File system navigation and analysis

## Development Commands

```bash
# Frontend
npm run dev              # Vite dev server (port 1420)
npm run build            # Production build
npm run preview          # Preview build

# Tauri
npm run tauri:dev        # Full development mode
npm run tauri:build      # Release build
npm run tauri            # Tauri CLI access

# Rust workspace
cargo build              # Build all packages
cargo test               # Run all tests
cargo check              # Type checking
cargo clippy             # Linting
cargo fmt                # Code formatting

# Quality assurance
npx tsc --noEmit         # TypeScript checking
npx eslint src/          # Frontend linting
npm run perf:analyze     # Performance analysis
```

## Project Structure

### Configuration Files
- `vite.config.ts` - Frontend build with Tauri optimizations
- `desktop/tauri.conf.json` - Tauri app configuration
- `Cargo.toml` - Rust workspace definition
- `package.json` - Frontend dependencies and scripts

### Key Components
- `src/components/ProjectWorkspace.tsx` - Main workspace interface
- `src/components/ProfileSelector.tsx` - Profile management
- `src/components/AIChatInterface.tsx` - AI interaction
- `src/store/appStore.ts` - Global state management
- `desktop/src/commands.rs` - Tauri backend commands

## Deployment

### Desktop Application
1. Build: `npm run tauri:build`
2. Distribute: `desktop/target/release/secondary-mind-desktop.exe`
3. Users need `GEMINI_API_KEY` in system environment

### Web Demo
1. Build: `npm run build:demo`
2. Deploy: `npm run deploy` (GitHub Pages)
3. Limited functionality (no backend features)

## Contributing

1. Follow existing code conventions
2. Run type checking: `npx tsc --noEmit`
3. Test locally: `npm run tauri:dev`
4. Performance check: `npm run perf:analyze`


---

**Note**: The `.env` file is for development only. Production releases require system-level environment variables for security.