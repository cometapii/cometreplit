# Real-Time Streaming Configuration

## 🎯 Cel

Ten dokument opisuje permanentną konfigurację real-time streamingu bez buforowania w aplikacji Comet Gemini.

## ⚙️ Konfiguracja

Wszystkie ustawienia znajdują się w pliku `lib/streaming-config.ts`.

### Kluczowe ustawienia

```typescript
export const STREAMING_CONFIG = {
  ENABLE_BUFFERING: false,              // ❌ Brak buforowania
  ENABLE_MESSAGE_GROUPING: false,       // ❌ Brak grupowania
  ENABLE_ARGUMENT_CHUNKING: false,      // ❌ Brak chunkowania
  IMMEDIATE_PROCESSING: true,           // ✅ Natychmiastowe przetwarzanie
}
```

## 🚫 ZAKAZY

### NIE wolno:

1. **Włączać buforowania** - każdy event musi być przetwarzany natychmiast
2. **Grupować wiadomości** - każdy fragment jako osobny element
3. **Dzielić argumentów na chunki** - wysyłaj kompletny JSON
4. **Dodawać opóźnień** - brak setTimeout, brak await przed renderowaniem
5. **Łączyć fragmentów** - nie akumuluj tekstu przed wyświetleniem

## ✅ Implementacja

### 1. useCustomChat.ts - Natychmiastowe przetwarzanie SSE

```typescript
// ✅ POPRAWNIE - natychmiastowe przetwarzanie
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // Tylko niekompletna linia

for (const line of lines) {
  const data = JSON.parse(line.slice(6));
  // Natychmiastowa aktualizacja UI
  setMessages(...);
}
```

```typescript
// ❌ ŹLE - buforowanie przed przetwarzaniem
let buffer = "";
while (processedUpTo < buffer.length) {
  // Czekanie na więcej danych
}
```

### 2. app/api/chat/route.ts - Kompletne argumenty + wymuszony flush

```typescript
// ✅ POPRAWNIE - async sendEvent z wymuszonym flush
const sendEvent = async (data: any) => {
  const eventData = { ...data, timestamp: Date.now() };
  const encoded = encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`);
  controller.enqueue(encoded);
  
  // KLUCZOWE: Wymuszenie natychmiastowego wysłania
  await new Promise(resolve => setImmediate(() => resolve(undefined)));
};

// Wszystkie wywołania z await
await sendEvent({
  type: "tool-argument-delta",
  delta: argsStr, // Kompletny JSON
});
```

```typescript
// ❌ ŹLE - sztuczne chunkowanie i brak flush
for (let i = 0; i < argsStr.length; i += 10) {
  sendEvent({
    delta: argsStr.slice(i, i + 10) // Fragmenty po 10 znaków
  });
}
```

### 3. components/message.tsx - Brak grupowania

```typescript
// ✅ POPRAWNIE - każda część osobno
<>
  {message.parts.map((part, index) => (
    <div key={`${message.id}-${index}`}>
      {/* Każda część jako osobny element */}
    </div>
  ))}
</>
```

```typescript
// ❌ ŹLE - grupowanie w kontener
<div className="flex flex-col gap-3">
  {message.parts.map(...)}
</div>
```

## 🔍 Walidacja

Plik `lib/streaming-config.ts` zawiera funkcję `validateStreamingConfig()`, która sprawdza poprawność konfiguracji przy każdym imporcie.

```typescript
// Automatyczna walidacja
validateStreamingConfig();
```

Jeśli konfiguracja jest niepoprawna, aplikacja rzuci błąd przy starcie.

## 📊 Architektura streamingu

```
Server (API)
    ↓
SSE Event (data: {...})
    ↓ controller.enqueue + setImmediate (flush)
Browser otrzymuje event
    ↓
Client (useCustomChat)
    ↓ split('\n') - natychmiast
Parse line
    ↓ flushSync + setMessages - natychmiast
React State
    ↓ render - natychmiastowy DOM update
UI (message.tsx)
    ↓ GPU layer repaint
Pojedynczy element (bez grupowania)
```

**Każdy krok jest natychmiastowy - ZERO opóźnień, ZERO buforowania**

## 🎯 Rezultat

### Przed naprawą:
- ❌ Buforowanie danych
- ❌ Chunking po 10 znaków
- ❌ Grupowanie wiadomości
- ❌ Opóźnienia w wyświetlaniu

### Po naprawie:
- ✅ Real-time streaming
- ✅ Zero buforowania
- ✅ Brak grupowania
- ✅ Natychmiastowe wyświetlanie

## 📝 Historia zmian

| Data | Zmiana | Plik |
|------|--------|------|
| 2025-10-03 | Usunięto buforowanie | `lib/use-custom-chat.ts` |
| 2025-10-03 | Usunięto chunking argumentów | `app/api/chat/route.ts` |
| 2025-10-03 | Usunięto grupowanie | `components/message.tsx` |
| 2025-10-03 | Dodano optymalne nagłówki | `app/api/chat/route.ts` |
| 2025-10-03 | Utworzono config | `lib/streaming-config.ts` |
| 2025-10-15 | Wymuszenie flush przez setImmediate | `app/api/chat/route.ts` |
| 2025-10-15 | Naprawa RealtimeMessage (usunięto zmienny key) | `components/realtime-message.tsx` |

## 🔧 Troubleshooting

### Problem: Wiadomości pojawiają się z opóźnieniem

**Rozwiązanie:** Sprawdź czy nie ma buforowania w `useCustomChat.ts`

### Problem: Argumenty narzędzi dzielą się na fragmenty

**Rozwiązanie:** Sprawdź `ENABLE_ARGUMENT_CHUNKING` w konfiguracji

### Problem: Wiadomości grupują się razem

**Rozwiązanie:** Sprawdź `ENABLE_MESSAGE_GROUPING` w konfiguracji

## 📚 Dodatkowe zasoby

- Server-Sent Events (SSE) standard: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- React state updates: https://react.dev/learn/state-as-a-snapshot
- HTTP streaming headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers

## ⚠️ WAŻNE

**NIE MODYFIKUJ** pliku `lib/streaming-config.ts` bez pełnego zrozumienia konsekwencji. Każda zmiana może zepsuć real-time streaming.

Jeśli musisz coś zmienić, najpierw:
1. Przeczytaj tę dokumentację
2. Zrozum architekturę streamingu
3. Przetestuj zmiany lokalnie
4. Sprawdź czy walidacja przechodzi
