# NoteFlow

**Turn messy input into structured notes on a corkboard**

NoteFlow is a voice-first note-taking application that transforms rough input — spoken or pasted — into structured, searchable records shaped by customizable templates. Notes live on a corkboard-style workspace where they can be dragged, pinned, and arranged freely.

## ✨ Features

### Core Functionality
- **🎤 Voice Capture** - Record audio with live transcription using Web Speech API
- **📝 Paste Capture** - Paste text directly for instant note creation
- **🤖 AI Restructuring** - Automatically transform raw notes into structured formats using Gemini (primary) and Groq (fallback)
- **📋 Template Library** - 6 preset templates (Meeting Minutes, SOAP, 1:1, Journal, Lecture, Interview)
- **🎨 Custom Templates** - Clone presets or build templates from scratch
- **📌 Corkboard Interface** - Drag, pin, and arrange notes on a visual workspace
- **🔍 Smart Search** - Full-text search across all note content
- **🏷️ Auto-Tagging** - AI-suggested tags and action item extraction
- **📑 Version History** - Keep raw captures alongside structured versions
- **🔄 Re-run Templates** - Apply different templates to existing notes

### Board Interactions
- **Drag & Drop** - Free positioning with snap-to-grid option
- **Z-Index Management** - Click/drag brings notes to front
- **Resize Notes** - Adjustable width per note
- **Collapse Notes** - Minimize to header cards
- **Stack & Arrange** - Auto-arrange into neat grids
- **Board Themes** - Light/dark appearance modes
- **Export Options** - Image, Markdown, and text export

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth + Row-Level Security |
| **File Storage** | Supabase Storage (private buckets) |
| **AI Provider** | Gemini (primary), Groq (fallback) |
| **Speech-to-Text** | Web Speech API (live), Whisper via Groq (cleanup) |
| **Validation** | Zod schemas |
| **Styling** | Tailwind CSS + Custom Design Tokens |
| **TypeScript** | Full type safety |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase account (free tier sufficient)
- Gemini API key ([Google AI Studio](https://makersuite.google.com/app/apikey))
- Groq API key ([Groq Console](https://console.groq.com/keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd struc.txt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database migration from `supabase/migrations/001_base_schema.sql`
   - Run additional migrations in order (002, 003, etc.)
   - Enable Email Auth in Authentication → Providers
   - Copy your Project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Creating Notes
1. Click "New capture" to open the capture modal
2. Choose between voice recording or text paste
3. Select a template (or capture first, apply template later)
4. AI restructuring runs automatically in the background
5. View structured results alongside your raw capture

### Board Navigation
- **Drag notes** to reposition them on the corkboard
- **Click notes** to bring them to front
- **Resize notes** using the handle in the bottom-right corner
- **Right-click** for context menu (duplicate, delete, etc.)
- **Use keyboard shortcuts** for quick actions (press ? for help)

### Search & Filter
- Use the search bar to find notes by title or content
- Filter by template, date range, or tags using the rail
- Combine filters for precise results

## 🖼️ Screenshots

*Note: Screenshots will be added once Phase 3 (Board Rendering) is completed. The UI is currently under development.*

### Planned Screenshots
- **Board Interface** - Main corkboard workspace with draggable notes
- **Capture Modal** - Voice recording and text paste interface
- **Template Selection** - Template library and customization
- **Structured Note View** - AI-restructured note with Meeting Minutes format

## 🏗️ Project Structure

```
struc.txt/
├── app/                      # Next.js App Router
│   ├── actions/              # Server actions (notes, restructure)
│   ├── board/                # Board page and components
│   ├── login/                # Authentication pages
│   └── page.tsx              # Home page
├── components/               # React components
│   ├── board/                # Board-specific components
│   ├── CaptureForm.tsx       # Note capture form
│   └── NoteList.tsx          # Notes list view
├── lib/                      # Utility libraries
│   ├── ai/                   # AI providers and restructuring
│   ├── prompts/              # AI prompt templates
│   ├── supabase/             # Supabase client helpers
│   └── tokens.ts             # Design token constants
├── styles/                   # Global styles
│   └── tokens.css            # Design tokens CSS
├── supabase/                 # Database migrations
│   └── migrations/           # SQL migration files
├── docs/                     # Documentation
│   ├── noteflow-spec.md      # Full technical specification
│   ├── PHASES_AND_GATES.md   # Development roadmap
│   ├── AGENTS.md             # Agent guidelines
│   └── SETUP.md              # Setup instructions
└── prototype/                # Design prototypes
    ├── Struc.txt Board.dc.html
    ├── Struc.txt Site.dc.html
    ├── tokens.js
    └── seed.js
```

## 🎯 Development Status

### Completed Phases
- ✅ **Phase 0**: Scaffolding (Next.js, Supabase, Auth)
- ✅ **Phase 1**: Paste capture with basic list view
- ✅ **Phase 2**: AI restructuring with Meeting Minutes template
- 🚧 **Phase 3**: Board rendering (in progress)

### Roadmap
See [docs/PHASES_AND_GATES.md](docs/PHASES_AND_GATES.md) for the complete development roadmap and exit gate criteria.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Supabase](https://supabase.com/)
- AI services via [Google Gemini](https://ai.google.dev/) and [Groq](https://groq.com/)
- Design inspired by corkboard interfaces and structured note-taking workflows

## 📞 Support

For support, questions, or feature requests, please open an issue on GitHub.

---

**NoteFlow** — Transform messy input into structured knowledge on a corkboard.