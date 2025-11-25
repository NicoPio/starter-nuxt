# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4 starter template built with Nuxt UI, featuring a modern component-based architecture with TypeScript, Tailwind CSS 4, and multiple Nuxt modules for enhanced functionality.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Generate static site
npm run generate

# Lint code
npx eslint .
```

## Architecture

### Stack

- **Framework**: Nuxt 4 with Vue 3.5
- **UI Library**: Nuxt UI (100+ accessible components with automatic dark mode)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/vite plugin)
- **Content**: Nuxt Content for content management with collections support
- **TypeScript**: Strict typing with project references to .nuxt generated configs
- **Database**: better-sqlite3 included for data persistence

### Key Modules

- `@nuxt/content` - Content management with schema validation
- `@nuxt/ui` - Comprehensive UI component library
- `@nuxt/image` - Image optimization
- `@nuxt/scripts` - Script loading management
- `@nuxt/eslint` - ESLint integration
- `@nuxt/hints` - Development hints
- `@nuxt/test-utils` - Testing utilities
- `nuxt-studio` - Content editing in Nuxt Studio

### Directory Structure

```
app/
├── app.vue           # Root application component
├── app.config.ts     # App-level configuration (currently empty)
├── assets/css/       # Global styles
│   └── main.css      # Tailwind imports + custom theme variables
├── components/       # Auto-imported Vue components
│   ├── AppLogo.vue
│   └── TemplateMenu.vue
└── pages/            # File-based routing
    └── index.vue     # Homepage with UPageHero, UPageSection components

content/              # Content files for Nuxt Content
├── index.yml         # Content data files

public/               # Static assets served at root
```

### Configuration Files

- `nuxt.config.ts` - Main Nuxt configuration with modules and Vite plugins
- `content.config.ts` - Defines content collections (e.g., "authors" collection with name, avatar, url schema)
- `tsconfig.json` - References .nuxt generated TypeScript configs
- `eslint.config.mjs` - Extends .nuxt/eslint.config.mjs for linting

### Content Collections

The project uses Nuxt Content collections with Zod schema validation. Currently defined:

- `authors` collection: data type, sources from `**.yml` files with schema for name, avatar, and url

### Styling Approach

- Tailwind CSS 4 with Vite plugin integration
- Custom theme variables defined in `app/assets/css/main.css` using `@theme static`
- Custom green color palette (50-950 shades) for brand colors
- Custom font: 'Public Sans' as the sans-serif family
- Nuxt UI components provide consistent design system

### Component Usage

The template uses Nuxt UI components extensively:

- `UPageHero` - Hero sections with title, description, and action links
- `UPageSection` - Content sections with optional features list
- `UPageCTA` - Call-to-action sections
- All components support Nuxt UI's theming, dark mode, and accessibility features

## Important Notes

- Auto-imports are enabled for components, composables, and utils
- TypeScript configuration relies on Nuxt-generated files in `.nuxt/` directory
- The `postinstall` script runs `nuxt prepare` to generate TypeScript definitions
- Compatibility date set to "2025-07-15"
- Devtools are enabled by default

Reply in french
