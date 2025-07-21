const fs = require('fs');
const path = require('path');

console.log('Organizing files for deployment...');

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
  console.log('Created public directory');
}

// Files that should be in public directory
const staticFiles = ['index.html', 'styles.css', 'dashboard.js', 'admin.html'];

staticFiles.forEach(file => {
  const rootFile = path.join(__dirname, file);
  const publicFile = path.join(publicDir, file);
  
  // If file exists in root but not in public, move it
  if (fs.existsSync(rootFile) && !fs.existsSync(publicFile)) {
    fs.copyFileSync(rootFile, publicFile);
    console.log(`Copied ${file} to public directory`);
  }
  
  // If file exists in both places, ensure public has the latest
  if (fs.existsSync(rootFile) && fs.existsSync(publicFile)) {
    const rootStat = fs.statSync(rootFile);
    const publicStat = fs.statSync(publicFile);
    
    if (rootStat.mtime > publicStat.mtime) {
      fs.copyFileSync(rootFile, publicFile);
      console.log(`Updated ${file} in public directory`);
    }
  }
});

// Ensure admin.html is always available
const adminHtmlPath = path.join(publicDir, 'admin.html');
if (!fs.existsSync(adminHtmlPath)) {
  console.log('Admin.html not found in public directory, attempting to create it...');
  
  // Try to find admin.html in root directory
  const rootAdminPath = path.join(__dirname, 'admin.html');
  if (fs.existsSync(rootAdminPath)) {
    fs.copyFileSync(rootAdminPath, adminHtmlPath);
    console.log('Admin.html copied from root to public directory');
  } else {
    console.log('Warning: Admin.html not found in root directory either');
  }
}

console.log('File organization complete!');

// List current file structure
console.log('\nCurrent file structure:');
console.log('Root directory:', fs.readdirSync(__dirname).filter(f => !f.startsWith('.')).join(', '));
if (fs.existsSync(publicDir)) {
  console.log('Public directory:', fs.readdirSync(publicDir).join(', '));
} 