const fs = require('fs');
const path = require('path');

const brand = process.argv[2] || 'default';
const brandDir = path.join(__dirname, '..', 'brands', brand);

if (!fs.existsSync(brandDir)) {
  console.error(`❌ Brand '${brand}' not found in brands/ directory`);
  process.exit(1);
}

const currentBrandDir = path.join(__dirname, '..', 'current-brand');

// Recursive function to clear or create directory
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Simple copy function for directories
function copyDir(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDir(brandDir, currentBrandDir);
  console.log(`✅ Switched to brand: ${brand}`);
  
  // Try to load the config to show the app name
  console.log(`   Brand directory prepared at: ${currentBrandDir}`);
} catch (err) {
  console.error(`❌ Error switching brand: ${err.message}`);
  process.exit(1);
}
