# Całkowite blokowanie Next.js Cache

## Zaimplementowane rozwiązania

### 1. **next.config.ts** - Konfiguracja Next.js
Dodano następujące ustawienia, które blokują cache na poziomie konfiguracji:

- **`generateBuildId`** - Generuje unikalny ID przy każdym buildzie, uniemożliwiając wykorzystanie cache
- **`images.unoptimized: true`** - Wyłącza optymalizację obrazów i ich cache
- **`onDemandEntries`** - Ustawia na 0, aby wyłączyć buforowanie wpisów

### 2. **disable-next-cache.js** - Aktywna blokada folderu cache
Skrypt, który:

- ✅ Usuwa folder `.next/cache` jeśli istnieje
- ✅ Tworzy PLIK zamiast folderu o nazwie `cache` w `.next/`
- ✅ Ustawia uprawnienia na 000 (brak dostępu)
- ✅ Monitoruje co 100ms i blokuje próby utworzenia folderu
- ✅ Działa w tle podczas uruchamiania Next.js

### 3. **package.json** - Nowe komendy

Dodano następujące skrypty:

```bash
# Uruchom serwer deweloperski z blokowaniem cache
npm run dev:no-cache

# Build z blokowaniem cache
npm run build:no-cache

# Uruchom tylko skrypt blokujący (w tle)
npm run block-cache
```

## Jak używać

### Opcja 1: Automatyczne blokowanie podczas startu
```bash
npm run dev:no-cache
```

### Opcja 2: Ręczne uruchomienie skryptu blokującego
```bash
# W jednym terminalu
node disable-next-cache.js

# W drugim terminalu
npm run dev
```

### Opcja 3: Tylko konfiguracja (bez aktywnego skryptu)
Obecna konfiguracja w `next.config.ts` już znacząco ogranicza cache - możesz użyć standardowego:
```bash
npm run dev
```

## Co zostało zablokowane

✅ Folder `.next/cache` - całkowicie uniemożliwiony  
✅ ISR (Incremental Static Regeneration) cache  
✅ Cache obrazów  
✅ Build cache  
✅ On-demand entries cache  

## Uwaga

⚠️ Wyłączenie cache może **znacząco spowolnić** działanie aplikacji, szczególnie podczas:
- Buildów produkcyjnych
- Hot reload podczas developmentu
- Optymalizacji obrazów

Używaj tych rozwiązań tylko jeśli cache rzeczywiście powoduje problemy w Twoim projekcie.

## Weryfikacja

Aby sprawdzić czy cache jest zablokowany:

1. Uruchom `npm run dev:no-cache`
2. Sprawdź folder `.next/` - powinien istnieć PLIK `cache`, nie folder
3. W konsoli zobaczysz: `🔒 Skrypt blokujący Next.js cache uruchomiony`
