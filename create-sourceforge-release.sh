#!/bin/bash

echo "========================================"
echo "Creazione pacchetti SourceForge"
echo "========================================"
echo ""

VERSION="1.0.0"
RELEASE_DIR="release-opensource"
OUTPUT_DIR="."

echo "[1/3] Verifica cartella release..."
if [ ! -d "$RELEASE_DIR" ]; then
    echo "ERRORE: Cartella $RELEASE_DIR non trovata!"
    exit 1
fi

echo ""
echo "[2/3] Creazione archivio TAR.GZ per Linux/Mac..."
cd "$RELEASE_DIR"
tar -czf "../WKF-Suite-v${VERSION}.tar.gz" --exclude=node_modules --exclude=data --exclude='*.sqlite' .* * 2>/dev/null
cd ..

if [ -f "WKF-Suite-v${VERSION}.tar.gz" ]; then
    echo "[OK] TAR.GZ creato: WKF-Suite-v${VERSION}.tar.gz"
    ls -lh "WKF-Suite-v${VERSION}.tar.gz"
else
    echo "[ERRORE] Creazione TAR.GZ fallita!"
fi

echo ""
echo "[3/3] Creazione archivio ZIP per Windows..."
if command -v zip &> /dev/null; then
    cd "$RELEASE_DIR"
    zip -r "../WKF-Suite-v${VERSION}.zip" . -x "node_modules/*" "data/*" "*.sqlite" > /dev/null
    cd ..

    if [ -f "WKF-Suite-v${VERSION}.zip" ]; then
        echo "[OK] ZIP creato: WKF-Suite-v${VERSION}.zip"
        ls -lh "WKF-Suite-v${VERSION}.zip"
    fi
else
    echo "[SKIP] comando zip non disponibile - solo TAR.GZ creato"
fi

echo ""
echo "========================================"
echo "Creazione completata!"
echo "========================================"
ls -lh WKF-Suite-v${VERSION}.*
echo ""
echo "Carica questi file su SourceForge"
