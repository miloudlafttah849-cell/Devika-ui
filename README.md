# Devika UI

This is the standalone frontend for Devika. It communicates with the Devika backend via WebSockets.

## Getting Started

### Requirements
- Bun

### Installation

1. Navigate to the `ui` directory.
2. Install dependencies:
   ```bash
   bun install
   ```
3. Configure your backend URL. Create a `.env` file or set the environment variable:
   ```bash
   VITE_API_URL=https://your-devika-backend.hf.space
   ```
4. Run the development server:
   ```bash
   bun run dev
   ```