const sharp = require('sharp');
const path = require('path');

async function makeTransparent() {
  const inputPath = path.join(__dirname, '../apps/frame.dev/public/openstrand-logo-light-1024.png');
  const outputPath = path.join(__dirname, '../apps/frame.dev/public/openstrand-logo-transparent.png');
  
  try {
    await sharp(inputPath)
      .ensureAlpha()
      .flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .negate({ alpha: false })
      .threshold(240)
      .negate({ alpha: false })
      .png()
      .toFile(outputPath);
    
    console.log('Created transparent logo at:', outputPath);
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

makeTransparent();
