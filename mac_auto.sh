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
    echo "Misalnya dengan: brew install node"
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
echo "3. Membuat eksekusi di Desktop..."
echo "=========================================="
SHORTCUT_PATH="$HOME/Desktop/Ning_dev.command"
WORKING_DIR="$(pwd)"

cat <<EOF > "$SHORTCUT_PATH"
#!/bin/bash
cd "$WORKING_DIR"
npm run dev
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
