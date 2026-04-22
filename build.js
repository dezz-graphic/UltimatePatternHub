const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

// Define exactly what to copy
const itemsToCopy = [
    'CSXS',
    'css',
    'js',
    'jsx',
    'index.html',
    'icon.png',
    'logo_lockscreen.png'
];

// Helper to copy files recursively
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        if (exists) {
            fs.copyFileSync(src, dest);
        }
    }
}

console.log('🚀 Starting Auto-Build Process...\n');

// 1. Clean and Create Dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('🗑️  Removed old dist folder.');
}
fs.mkdirSync(distDir);
console.log('📁 Created new empty dist folder.\n');

// 2. Copy specific items to dist
console.log('📦 Copying files to dist...');
itemsToCopy.forEach(item => {
    const srcPath = path.join(rootDir, item);
    const destPath = path.join(distDir, item);
    
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`✅ Copied: ${item}`);
    } else {
        console.warn(`⚠️ Warning: ${item} not found.`);
    }
});
console.log('\n✅ File preparation complete.\n');

// 3. Compile with Inno Setup
console.log('⏳ Compiling installer with Inno Setup... (This may take a few seconds)');
const isccPathRaw = 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe';
const isccPath = `"${isccPathRaw}"`;
const issFile = 'build_installer.iss';

if (!fs.existsSync(isccPathRaw)) {
    console.log(`\n⚠️  Inno Setup 6 not found at: ${isccPathRaw}`);
    console.log(`💡 Skipping installer build. Your files are ready in the 'dist' folder.`);
} else {
    // Run ISCC.exe
    exec(`${isccPath} ${issFile}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`\n❌ Error compiling installer:`);
            console.error(error.message);
            console.error(`\n💡 Tip: Make sure Inno Setup 6 is installed at the expected path.`);
            return;
        }
        
        console.log(`\n🎉 Build Complete Successfully!`);
        console.log(`📁 Your installer 'UltimatePatternHub_Installer.exe' is ready.`);
    });
}
