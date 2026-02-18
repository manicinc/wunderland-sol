#!/usr/bin/env node
/**
 * Optimize prompt images for web
 * Converts PNG to WebP with quality optimization
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const promptsDir = process.argv[2] || path.join(__dirname, '../public/prompts');

async function optimizeImages() {
  const files = fs.readdirSync(promptsDir).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} PNG files to optimize`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of files) {
    const inputPath = path.join(promptsDir, file);
    const outputPath = path.join(promptsDir, file.replace('.png', '.webp'));

    const originalSize = fs.statSync(inputPath).size;
    totalOriginal += originalSize;

    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);

    const newSize = fs.statSync(outputPath).size;
    totalOptimized += newSize;

    // Remove original PNG
    fs.unlinkSync(inputPath);

    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`${file}: ${(originalSize/1024/1024).toFixed(2)}MB -> ${(newSize/1024/1024).toFixed(2)}MB (${savings}% smaller)`);
  }

  console.log(`\nTotal: ${(totalOriginal/1024/1024).toFixed(1)}MB -> ${(totalOptimized/1024/1024).toFixed(1)}MB`);
  console.log(`Saved: ${((totalOriginal - totalOptimized)/1024/1024).toFixed(1)}MB (${((1 - totalOptimized/totalOriginal) * 100).toFixed(1)}%)`);
}

optimizeImages().catch(console.error);
