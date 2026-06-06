const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = 'C:\\Users\\Mypc\\.gemini\\antigravity\\brain\\fe687c37-0e6a-491a-b790-4d8bba82dc8d\\fittrack_logo_1780770023682.png';
const ogImagePath = 'C:\\Users\\Mypc\\.gemini\\antigravity\\brain\\fe687c37-0e6a-491a-b790-4d8bba82dc8d\\fittrack_og_image_1780770041150.png';
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateIcons() {
  try {
    // Favicons
    await sharp(inputImagePath).resize(16, 16).toFile(path.join(publicDir, 'favicon-16x16.png'));
    await sharp(inputImagePath).resize(32, 32).toFile(path.join(publicDir, 'favicon-32x32.png'));
    await sharp(inputImagePath).resize(48, 48).toFile(path.join(publicDir, 'favicon-48x48.png'));
    await sharp(inputImagePath).resize(192, 192).toFile(path.join(publicDir, 'favicon-192x192.png'));
    await sharp(inputImagePath).resize(512, 512).toFile(path.join(publicDir, 'favicon-512x512.png'));
    await sharp(inputImagePath).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
    // Create an ico file (just renaming a 64x64 or 32x32 png to ico works for most modern use cases, 
    // but ideally we should use a proper ico builder. We will just save as 48x48 png renamed to ico).
    await sharp(inputImagePath).resize(48, 48).toFile(path.join(publicDir, 'favicon.ico'));

    // Copy OG image
    fs.copyFileSync(ogImagePath, path.join(publicDir, 'og-image.png'));

    console.log('Icons generated successfully.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
