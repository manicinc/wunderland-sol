#!/bin/bash
# Optimize prompt images for web deployment
# - Moves originals to prompts-originals/ (gitignored)
# - Creates optimized 512px wide WebP images
# - Reduces ~326MB to ~15MB

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROMPTS_DIR="$PROJECT_DIR/public/prompts"
ORIGINALS_DIR="$PROJECT_DIR/prompts-originals"

echo "🔧 Prompt Image Optimizer"
echo "========================="
echo "Source: $PROMPTS_DIR"
echo "Originals backup: $ORIGINALS_DIR"
echo ""

# Check for cwebp (WebP encoder)
if ! command -v cwebp &> /dev/null; then
    echo "❌ cwebp not found. Install with: brew install webp"
    exit 1
fi

# Create originals backup directory
mkdir -p "$ORIGINALS_DIR"

# Count files
TOTAL=$(ls "$PROMPTS_DIR"/*.webp 2>/dev/null | wc -l | tr -d ' ')
echo "📦 Found $TOTAL image files to optimize"
echo ""

# Get original size
ORIGINAL_SIZE=$(du -sh "$PROMPTS_DIR" | cut -f1)
echo "📊 Original size: $ORIGINAL_SIZE"

# Process each image
COUNT=0
for img in "$PROMPTS_DIR"/*.webp; do
    if [ ! -f "$img" ]; then continue; fi
    
    filename=$(basename "$img")
    COUNT=$((COUNT + 1))
    
    # Skip if already optimized (check file size < 200KB)
    size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
    if [ "$size" -lt 200000 ]; then
        echo "[$COUNT/$TOTAL] ⏭️  $filename (already optimized)"
        continue
    fi
    
    echo -n "[$COUNT/$TOTAL] 🔄 $filename... "
    
    # Backup original if not already backed up
    if [ ! -f "$ORIGINALS_DIR/$filename" ]; then
        cp "$img" "$ORIGINALS_DIR/$filename"
    fi
    
    # Create temp file for conversion
    temp_file=$(mktemp).png
    
    # First convert to PNG (since files are mislabeled)
    # Then resize and convert to real WebP
    if command -v convert &> /dev/null; then
        # ImageMagick available
        convert "$img" -resize 512x512\> -quality 85 "$temp_file"
        cwebp -q 80 -m 6 "$temp_file" -o "$img" 2>/dev/null
    else
        # Use sips (macOS built-in) for resize, then cwebp
        sips -Z 512 "$img" --out "$temp_file" 2>/dev/null
        cwebp -q 80 -m 6 "$temp_file" -o "$img" 2>/dev/null
    fi
    
    rm -f "$temp_file"
    
    new_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
    new_size_kb=$((new_size / 1024))
    echo "✅ ${new_size_kb}KB"
done

# Get new size
NEW_SIZE=$(du -sh "$PROMPTS_DIR" | cut -f1)
BACKUP_SIZE=$(du -sh "$ORIGINALS_DIR" | cut -f1)

echo ""
echo "✨ Optimization complete!"
echo "========================="
echo "📊 Original size: $ORIGINAL_SIZE"
echo "📊 Optimized size: $NEW_SIZE"
echo "📦 Originals backed up: $BACKUP_SIZE"
echo ""
echo "💡 Add to .gitignore: prompts-originals/"



