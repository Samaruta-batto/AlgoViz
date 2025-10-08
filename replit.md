# AlgoViz Suite

## Overview
An interactive suite for visualizing complex algorithms including Data Structures & Algorithms (DAA) and Operating Systems (OS) concepts. Built with Next.js 15.3.3, React 18, and Tailwind CSS.

## Recent Changes (October 8, 2025)
- **Vercel to Replit Migration**: Migrated project from Vercel to Replit
  - Updated development server to bind to port 5000 on 0.0.0.0 (Replit requirement)
  - Updated production server to use same port configuration
  - Configured Replit workflow for automatic dev server startup
  - Set up autoscale deployment configuration with proper build and start commands
  - Cross-origin warnings in dev are expected due to Replit's proxy environment and don't affect functionality

- **Bug Fixes & Improvements**:
  - **Red-Black Tree Visualization**: Fixed black nodes to display in dark gray (#1F2937) with black stroke instead of green, making them distinguishable from red nodes (#EF4444)
  - **DAA Page Legend**: Added "Black Node (RBT)" entry for clarity
  - **Fork() System Call Visualizer**: Completely rewrote parser to handle various C-like brace styles including:
    - Braces on same line as if statement: `if (fork() == 0) {`
    - Braces on next line
    - Else blocks with various patterns: `} else {`, `else {`, `else`, inline `else statement;`
    - Single-line if/else statements without braces
  - **TypeScript Fixes**: Resolved all type errors in binomialHeap.ts, drawing.ts, and utils.ts
  - **B-Tree & Binomial Heap**: Verified implementations are correct per standard algorithms (no changes needed)

## Project Architecture

### Technology Stack
- **Framework**: Next.js 15.3.3 (App Router)
- **UI**: React 18.3.1 with TypeScript 5
- **Styling**: Tailwind CSS with shadcn/ui components
- **AI Integration**: Google Genkit for AI features
- **Charts**: Recharts for data visualization

### Directory Structure
```
src/
├── app/              # Next.js app router pages
│   ├── daa/         # Data Structures & Algorithms visualizer
│   ├── os/          # Operating Systems visualizer
│   ├── layout.tsx   # Root layout
│   └── page.tsx     # Home page
├── components/      # React components
│   ├── os/         # OS-specific visualizers
│   └── ui/         # shadcn/ui components
├── lib/            # Utilities and algorithms
│   └── algorithms/ # Algorithm implementations
└── ai/             # Genkit AI configuration
```

### Features
- **DAA Visualizer**: Interactive visualization of data structures
  - Binary Search Trees (BST)
  - Red-Black Trees (RBT)
  - B-Trees
  - Heaps & Binomial Heaps
- **OS Visualizer**: Simulation of OS concepts
  - CPU Scheduling Algorithms
  - Page Replacement Algorithms
  - Process Fork Visualization

## Configuration

### Ports
- Development: Port 5000 (required for Replit)
- Production: Port 5000

### Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking

### Deployment
- **Target**: Autoscale (stateless web app)
- **Build**: `npm run build`
- **Start**: `npm run start`

## Environment Variables
No environment variables currently required. The project uses client-side only features.

## Known Issues
- 5 npm audit vulnerabilities (3 low, 2 moderate) - non-critical, scheduled for review
- TypeScript build errors ignored in next.config (intentional for rapid development, but all current errors have been resolved)

## User Preferences
- None specified yet
