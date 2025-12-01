# Delivery Network Frontend

Next.js frontend application for the Centralized Delivery Network.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Backend API server running (see `../backend/README.md`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. Start development server:
```bash
npm run dev
```

The app will run on `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── (agent)/           # Agent pages
│   ├── (partner)/         # Partner pages
│   ├── (admin)/           # Admin pages
│   └── layout.tsx
├── components/            # React components
├── lib/                   # Utilities
│   └── api/              # API client (axios)
├── hooks/                # Custom React hooks
└── types/                # TypeScript types
```

## 🔌 API Communication

The frontend communicates with the backend API via:
- **HTTP**: Using `axios` to make REST API calls
- **WebSocket**: Using `socket.io-client` for real-time updates

Backend API base URL: `http://localhost:5000/api` (configurable via `NEXT_PUBLIC_API_URL`)

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **WebSocket**: Socket.io Client
- **Maps**: Mapbox GL
- **Charts**: Recharts
- **Validation**: Zod

## 📝 Environment Variables

See `.env.local.example` for all required environment variables.

## 🛠️ Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 📝 License

ISC
