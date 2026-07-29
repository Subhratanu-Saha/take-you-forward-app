/**
 * Pre-Deployment Build Verification Script
 * 
 * Performs 3 core modular checks before deployment:
 * 1. Generates Prisma Client artifacts
 * 2. Recursively validates JavaScript syntax for all .js files
 * 3. Performs a dry-run import of the application dependency tree
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==================== HELPER UTILITIES ====================

const printHeader = (text) => {
  console.log('====================================================');
  console.log(`      ${text}`);
  console.log('====================================================\n');
};

const printStep = (stepNumber, totalSteps, title) => {
  console.log(`[${stepNumber}/${totalSteps}] ${title}`);
};

const printSuccess = (message) => {
  console.log(`  ✔ ${message}\n`);
};

// ==================== MODULAR VERIFICATION STEPS ====================

/**
 * Step 1: Generate Prisma ORM Client
 */
const generatePrismaClient = () => {
  printStep(1, 3, '⚙️  Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  printSuccess('Prisma Client generation complete.');
};

/**
 * Recursively checks JS syntax for a given directory
 * @param {string} dirPath - Directory absolute path
 */
const checkDirectorySyntax = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Ignore dependencies and git folders
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        checkDirectorySyntax(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      execSync(`node -c "${fullPath}"`);
    }
  }
};

/**
 * Step 2: Validate JavaScript syntax across entrypoints and src directory
 */
const validateJavaScriptSyntax = () => {
  printStep(2, 3, '🧪 Checking JavaScript Syntax across codebase...');

  // Check root server.js entrypoint syntax
  const rootServerPath = path.join(__dirname, '..', 'server.js');
  if (fs.existsSync(rootServerPath)) {
    execSync(`node -c "${rootServerPath}"`);
  }

  // Check src directory files recursively
  const srcDir = path.join(__dirname, '..', 'src');
  if (fs.existsSync(srcDir)) {
    checkDirectorySyntax(srcDir);
  }

  printSuccess('Syntax validation passed for all .js files.');
};

/**
 * Step 3: Perform dry-run import of application entrypoint
 */
const dryRunAppImport = () => {
  printStep(3, 3, '🚀 Dry-running application module graph import...');

  // Requiring app.js validates routes, controllers, middleware, and models initialization
  require('../src/app');

  printSuccess('Application modules, routes, and controllers loaded successfully.');
};

// ==================== MAIN EXECUTION CONTROLLER ====================

const runBuildVerification = () => {
  printHeader('🔍 PRE-DEPLOYMENT BUILD VERIFICATION');

  try {
    generatePrismaClient();
    validateJavaScriptSyntax();
    dryRunAppImport();

    printHeader('✅ [BUILD SUCCESS] All verification checks passed!');
  } catch (error) {
    console.error('\n❌ [BUILD FAILED] Build verification failed with error:');
    console.error(error.message);
    process.exit(1);
  }
};

// Execute build pipeline
runBuildVerification();
