# Operator - Computer Use AI Assistant

> Asystent AI kontrolujący komputer poprzez Next.js, E2B Desktop i Azure OpenAI

## 📁 Struktura Projektu

```
operator/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── chat/         # Główny endpoint streamu
│   │   ├── db-query/     # Zapytania do bazy
│   │   ├── db-test/      # Testy bazy
│   │   └── kill-desktop/ # Zabijanie sesji E2B
│   ├── globals.css       # Style globalne
│   ├── layout.tsx        # Layout aplikacji
│   └── page.tsx          # Strona główna
│
├── components/            # Komponenty React
│   ├── ui/               # Komponenty UI (shadcn)
│   ├── message.tsx       # Renderowanie wiadomości
│   ├── realtime-message.tsx  # Streaming w czasie rzeczywistym
│   ├── input.tsx         # Input czatu
│   └── ...               # Komponenty cache-busting
│
├── lib/                   # Biblioteki i utilities
│   ├── e2b/              # Integracja E2B Desktop
│   │   ├── tool.ts       # Definicja narzędzi computer
│   │   └── utils.ts      # Utilities E2B
│   ├── use-custom-chat.ts    # Hook czatu z flushSync
│   ├── streaming-config.ts   # Konfiguracja streamingu
│   └── utils.ts          # Ogólne utility
│
├── disable-next-cache.js  # Skrypt blokujący cache
├── next.config.ts         # Konfiguracja Next.js (NO CACHE)
├── middleware.ts          # Middleware cache control
├── package.json           # Zależności
└── .env.example          # Przykładowa konfiguracja

```

## 🚀 Instalacja

### 1. Sklonuj kod

```bash
cd operator
npm install
```

### 2. Konfiguracja środowiska

Skopiuj `.env.example` do `.env.local`:

```bash
cp .env.example .env.local
```

Uzupełnij zmienne środowiskowe:

```env
AZURE_OPENAI_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=twój-klucz-api
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_API_VERSION=2024-12-01-preview

E2B_API_KEY=twój-klucz-e2b
```

### 3. Uruchomienie

```bash
npm run dev:no-cache    # Development z wyłączonym cache
npm run build:no-cache  # Build production bez cache
npm start               # Production server
```

## 🔥 Kluczowe Funkcje

### ✅ Całkowite Wyłączenie Cache Next.js

- **next.config.ts** - konfiguracja `no-store`
- **disable-next-cache.js** - aktywny bloker `.next/cache`
- **middleware.ts** - headers `Cache-Control: no-cache`
- **package.json** - skrypty `dev:no-cache`, `build:no-cache`

### ✅ Real-time Streaming (BEZ batchingu)

- **flushSync** - synchroniczne renderowanie każdej delty tekstu
- **JSON Lines** - streaming przez fetch (nie WebSocket)
- **Node.js runtime** - prawdziwy stream (nie Edge)
- Każda delta → natychmiastowe wyświetlenie (zero opóźnień)

### ✅ Separacja Fragmentów

- Każdy fragment tekstu → osobny element
- Każda akcja (tool call) → osobny blok
- Wizualne wskaźniki streamingu (migający kursor)

## 📝 Dokumentacja

- **BLOKOWANIE-CACHE.md** - System blokowania cache (PL)
- **STREAMING.md** - Architektura streamingu
- **CHANGES.md** - Historia zmian

## 🛠 Stack Technologiczny

- **Next.js 15** (App Router, Node.js runtime)
- **React 19** (flushSync dla synchronicznego renderowania)
- **Azure OpenAI** (GPT-4.1-mini z function calling)
- **E2B Desktop** (Sandbox z GUI dla computer use)
- **TypeScript** + **Tailwind CSS**
- **shadcn/ui** (komponenty UI)

## 🎯 Jak Działa

1. **User** → wpisuje prompt w interfejsie czatu
2. **Frontend** → `use-custom-chat.ts` wysyła request do `/api/chat`
3. **Backend** → Azure OpenAI generuje response z tool calls
4. **E2B Desktop** → wykonuje akcje computer (screenshot, click, type)
5. **Streaming** → każda delta tekstu/akcji → `flushSync` → natychmiastowy render
6. **No Cache** → każde odświeżenie strony = świeży stan (zero cache)

## 🔒 Bezpieczeństwo

⚠️ **UWAGA**: W folderze znajduje się hardkodowany klucz API Azure w `app/api/chat/route.ts`

Przed produkcją:
1. Przenieś klucze do zmiennych środowiskowych
2. Użyj `.env.local` (nigdy nie commituj!)
3. Zaktualizuj kod aby używał `process.env.*`

## 📦 Zależności

Główne paczki:
- `next` - framework
- `react` + `react-dom` - UI (flushSync!)
- `openai` - Azure OpenAI SDK
- `@e2b/code-interpreter` - E2B Desktop
- `ai` - Vercel AI SDK (utils)
- `tailwindcss` - styling

## 🐛 Debug

Jeśli streaming nie działa:
1. Sprawdź czy używasz `npm run dev:no-cache`
2. Zweryfikuj `disable-next-cache.js` (powinien być aktywny)
3. Zobacz logi w konsoli przeglądarki
4. Upewnij się że folder `.next/cache` NIE istnieje

Jeśli fragmenty się łączą:
1. Sprawdź `use-custom-chat.ts` - musi używać `flushSync`
2. Zobacz `realtime-message.tsx` - każdy render powinien być natychmiastowy
3. Zweryfikuj że backend wysyła oddzielne eventy (JSON Lines)

## 📄 Licencja

Kod aplikacji - sprawdź LICENSE jeśli istnieje.

---

**Wersja**: 1.0  
**Data**: Październik 2025  
**Autor**: Operator AI Project
