#!/bin/bash

# Berpindah ke direktori tempat script ini berada
cd "$(dirname "$0")" || exit

echo "=========================================="
echo "1. Memeriksa instalasi Node.js..."
echo "=========================================="
if ! command -v node &> /dev/null
then
    echo "Node.js belum terinstal."
    echo "Silakan instal Node.js terlebih dahulu."
    echo "Misalnya dengan: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
else
    echo "Node.js sudah terinstal."
fi

echo ""
echo "=========================================="
echo "2. Memeriksa dependencies npm..."
echo "=========================================="
if [ ! -d "node_modules" ]; then
    echo "node_modules tidak ditemukan. Menjalankan npm install..."
    npm install
else
    echo "Dependencies sudah terinstal (node_modules ditemukan)."
fi

echo ""
echo "=========================================="
echo "3. Membuat shortcut di Desktop..."
echo "=========================================="
# Memastikan direktori Desktop ada, menggunakan xdg-user-dir jika ada
if command -v xdg-user-dir &> /dev/null; then
    DESKTOP_DIR=$(xdg-user-dir DESKTOP)
else
    DESKTOP_DIR="$HOME/Desktop"
fi

SHORTCUT_PATH="$DESKTOP_DIR/Ning.desktop"
ICON_PATH="$(pwd)/src-tauri/icons/icon.png"
WORKING_DIR="$(pwd)"

cat <<EOF > "$SHORTCUT_PATH"
[Desktop Entry]
Version=1.0
Name=Ning
Comment=Run Ning Dev
Exec=bash -c "cd '$WORKING_DIR' && npm run dev; exec bash"
Icon=$ICON_PATH
Terminal=true
Type=Application
Categories=Development;
EOF

chmod +x "$SHORTCUT_PATH"

if [ -f "$SHORTCUT_PATH" ]; then
    echo "Shortcut 'Ning' berhasil dibuat di Desktop."
else
    echo "Gagal membuat shortcut."
fi

echo ""
echo "=========================================="
echo "4. Menjalankan aplikasi (npm run dev)..."
echo "=========================================="
npm run dev
