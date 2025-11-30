# SafeSpan

A paycheck-to-paycheck budgeting app that answers one simple question: **"How much is actually safe to spend right now?"**

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore and Authentication enabled

### Installation

```bash
# Clone and enter directory
cd SafeSpan

# Install dependencies
cd functions && npm install
cd ../client && npm install
cd ..

# Configure Firebase
firebase login
firebase use --add  # Select your project

# Set up environment
cp client/.env.example client/.env.local
# Edit client/.env.local with your Firebase config
```

### Development

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start frontend dev server
cd client && npm run dev
```

Visit `http://localhost:5173` to use the app.

Emulator UI available at `http://localhost:4000`.

### Project Structure

```
SafeSpan/
├── client/                 # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── context/        # React context (Auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client, Firebase
│   │   └── utils/          # Helpers (formatting)
│   └── ...
├── functions/              # Firebase Cloud Functions
│   └── src/
│       └── api/            # Express API
│           ├── routes/     # Endpoint handlers
│           ├── services/   # Business logic
│           ├── middleware/ # Auth, error handling
│           └── utils/      # Helpers
├── firebase.json           # Firebase configuration
├── firestore.rules         # Security rules
└── firestore.indexes.json  # Composite indexes
```

## API Documentation

See [DESIGN_API.md](./DESIGN_API.md) for complete API documentation.

## Data Model

See [DESIGN_DATA_MODEL.md](./DESIGN_DATA_MODEL.md) for Firestore schema documentation.

## License

MIT
