const fs = require('fs');
const { execSync } = require('child_process');

try {
  execSync('npm install sharp', { stdio: 'inherit' });
} catch (e) {
  console.log('Failed to install sharp');
}

const sharp = require('sharp');

const svgBuffer = fs.readFileSync('public/logo.svg');

async function convert() {
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/logo-white.png');
    
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/logo.png');
    
  console.log('Done!');
}

convert();
