const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '.next', 'cache');
const NEXT_DIR = path.join(__dirname, '.next');

function blockCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      console.log('✓ Usunięto folder .next/cache');
    }

    if (!fs.existsSync(NEXT_DIR)) {
      fs.mkdirSync(NEXT_DIR, { recursive: true });
    }

    fs.writeFileSync(CACHE_DIR, '', { flag: 'w' });
    fs.chmodSync(CACHE_DIR, 0o000);
    console.log('✓ Zablokowano tworzenie folderu .next/cache (utworzono plik zamiast folderu)');
  } catch (error) {
    console.error('Błąd podczas blokowania cache:', error.message);
  }
}

blockCache();

setInterval(() => {
  if (fs.existsSync(CACHE_DIR)) {
    const stats = fs.statSync(CACHE_DIR);
    if (stats.isDirectory()) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      fs.writeFileSync(CACHE_DIR, '', { flag: 'w' });
      fs.chmodSync(CACHE_DIR, 0o000);
      console.log('⚠ Wykryto i zablokowano próbę utworzenia folderu cache');
    }
  }
}, 100);

process.on('SIGINT', () => {
  console.log('\n✓ Skrypt blokujący cache zatrzymany');
  process.exit(0);
});

console.log('🔒 Skrypt blokujący Next.js cache uruchomiony - działanie ciągłe');
