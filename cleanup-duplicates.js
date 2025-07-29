/**
 * 🧹 CLEANUP SCRIPT - Remove Duplicate and Unnecessary Files
 * Safely removes development artifacts while preserving production code
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 === CLEANUP DUPLICATES AND UNNECESSARY FILES ===\n');

// Define patterns for files to remove
const CLEANUP_PATTERNS = {
  // Development artifacts
  cleanFiles: {
    pattern: /-clean\.js$/,
    description: 'Clean architecture development files',
    exclude: [] // All can be removed since originals have been replaced
  },
  
  testFiles: {
    pattern: /^test-.*\.js$/,
    description: 'Test suite files',
    exclude: [] // Keep none in production
  },
  
  backupFiles: {
    pattern: /\.original\.backup\.js$/,
    description: 'Original backup files',
    exclude: [] // Can be removed after verification
  },
  
  duplicatesFolder: {
    path: './backups/duplicates',
    description: 'Duplicates backup folder',
    exclude: []
  },
  
  tempFiles: {
    pattern: /\.(tmp|temp|bak)$/,
    description: 'Temporary files',
    exclude: []
  }
};

// Files to definitely keep
const KEEP_FILES = [
  'cleanup-duplicates.js', // This script
  'package.json',
  'package-lock.json',
  'README.md',
  'CLAUDE.md',
  '.gitignore'
];

// Track what we'll remove
const filesToRemove = {
  cleanFiles: [],
  testFiles: [],
  backupFiles: [],
  duplicatesFolder: [],
  tempFiles: [],
  other: []
};

// Function to recursively find files
function findFiles(dir, pattern, exclude = []) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      
      if (entry.isDirectory()) {
        files.push(...findFiles(fullPath, pattern, exclude));
      } else if (entry.isFile()) {
        if (pattern.test(entry.name) && !exclude.includes(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

// Find all files to remove
console.log('🔍 Searching for files to clean up...\n');

// Clean architecture files
filesToRemove.cleanFiles = findFiles('.', CLEANUP_PATTERNS.cleanFiles.pattern, CLEANUP_PATTERNS.cleanFiles.exclude);
console.log(`Found ${filesToRemove.cleanFiles.length} clean architecture files`);

// Test files
filesToRemove.testFiles = findFiles('.', CLEANUP_PATTERNS.testFiles.pattern, CLEANUP_PATTERNS.testFiles.exclude);
console.log(`Found ${filesToRemove.testFiles.length} test files`);

// Backup files
filesToRemove.backupFiles = findFiles('.', CLEANUP_PATTERNS.backupFiles.pattern, CLEANUP_PATTERNS.backupFiles.exclude);
console.log(`Found ${filesToRemove.backupFiles.length} backup files`);

// Temporary files
filesToRemove.tempFiles = findFiles('.', CLEANUP_PATTERNS.tempFiles.pattern, CLEANUP_PATTERNS.tempFiles.exclude);
console.log(`Found ${filesToRemove.tempFiles.length} temporary files`);

// Check duplicates folder
if (fs.existsSync(CLEANUP_PATTERNS.duplicatesFolder.path)) {
  filesToRemove.duplicatesFolder = [CLEANUP_PATTERNS.duplicatesFolder.path];
  console.log(`Found duplicates folder`);
}

// Calculate total
const totalFiles = Object.values(filesToRemove).reduce((sum, arr) => sum + arr.length, 0);

console.log(`\n📊 Total files to remove: ${totalFiles}`);

// Show what will be removed
console.log('\n📋 Files to be removed:\n');

for (const [category, files] of Object.entries(filesToRemove)) {
  if (files.length > 0) {
    console.log(`\n${CLEANUP_PATTERNS[category]?.description || category}:`);
    files.slice(0, 10).forEach(file => console.log(`  - ${file}`));
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }
  }
}

// Function to remove files safely
function removeFiles(dryRun = true) {
  let removedCount = 0;
  let errorCount = 0;
  
  for (const [category, files] of Object.entries(filesToRemove)) {
    for (const file of files) {
      try {
        if (!dryRun) {
          if (fs.lstatSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file);
          }
        }
        removedCount++;
      } catch (error) {
        console.error(`❌ Error removing ${file}:`, error.message);
        errorCount++;
      }
    }
  }
  
  return { removedCount, errorCount };
}

// Prompt for confirmation
console.log('\n⚠️  WARNING: This will permanently delete the files listed above.');
console.log('💡 Recommendation: Ensure you have a backup before proceeding.\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you want to proceed with cleanup? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\n🗑️  Removing files...\n');
    
    const { removedCount, errorCount } = removeFiles(false);
    
    console.log('\n✅ Cleanup completed!');
    console.log(`📊 Files removed: ${removedCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    
    // Calculate space saved
    const sizeBefore = totalFiles * 50; // Rough estimate: 50KB per file
    console.log(`💾 Estimated space saved: ~${(sizeBefore / 1024).toFixed(1)} MB`);
    
  } else {
    console.log('\n❌ Cleanup cancelled.');
    console.log('💡 You can run this script again when ready.');
  }
  
  rl.close();
});

// Export for testing
module.exports = { findFiles, removeFiles, CLEANUP_PATTERNS };