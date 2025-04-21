import { defineConfig } from '@vscode/test-cli';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';
import * as fs from 'fs';
import * as semver from 'semver';

// Get the directory name equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the VS Code version from the extension's package.json
 * @returns {string} The VS Code version from package.json engines field (without the ^ or ~)
 */
function getEngineVersionFromPackageJson() {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.engines && packageJson.engines.vscode) {
        // Extract the version number without ^ or ~ prefixes
        const versionMatch = packageJson.engines.vscode.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch && versionMatch[1]) {
          // Don't use console.log here - it breaks the test runner's JSON output
          // Commands like `npx @vscode/test-cli --list-configuration` expect clean JSON output
          return versionMatch[1];
        }
      }
    }
  } catch (err) {
    // Use stderr for warnings to avoid breaking the test runner's JSON parsing
    console.error(`Error reading VS Code version from package.json: ${err.message}`);
  }
  // Default fallback version
  return '1.71.2';
}

/**
 * Find VS Code extensions in the user's extensions directory that are compatible with the specified VS Code version
 * @param {string|string[]} extensionPrefixes - Extension ID prefix(es) to search for (e.g., 'github.remotehub' or ['github.remotehub', 'ms-python.python'])
 * @param {object} options - Configuration options
 * @param {string} [options.vscodeVersion] - The VS Code version to check compatibility with. If null, skips version check.
 * @param {boolean} [options.skipVersionCheck=false] - If true, skips version compatibility check entirely
 * @param {boolean} [options.silent=false] - If true, suppresses console warnings about missing or incompatible extensions
 * @returns {string[]} - Array of absolute paths to found extension directories (empty if none found)
 */
function findVSCodeExtensions(extensionPrefixes, options = {}) {
  const { 
    vscodeVersion = null, 
    skipVersionCheck = false,
    silent = false 
  } = options;
  
  // VS Code uses the same extensions directory structure across all platforms
  const extensionsDir = path.join(os.homedir(), '.vscode', 'extensions');
  
  // Convert single string to array for consistent processing
  const prefixArray = Array.isArray(extensionPrefixes) ? extensionPrefixes : [extensionPrefixes];
  const foundExtensions = [];

  /**
   * Check if an extension is compatible with the specified VS Code version
   * @param {string} extensionPath - The path to the extension directory
   * @returns {boolean} - Whether the extension is compatible
   */
  function isExtensionCompatible(extensionPath) {
    // Skip compatibility check if requested or no version provided
    if (skipVersionCheck || !vscodeVersion) {
      return true;
    }
    
    try {
      const packageJsonPath = path.join(extensionPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (!packageJson.engines || !packageJson.engines.vscode) {
        // If no engine constraints are specified, assume it's compatible
        return true;
      }
      
      const engineRequirement = packageJson.engines.vscode;
      
      // Handle special case where the requirement is just "^1.74.0" format
      if (engineRequirement.startsWith('^') || engineRequirement.startsWith('>=')) {
        return semver.satisfies(vscodeVersion, engineRequirement);
      }
      
      // Handle range format like ">=1.70.0 <1.80.0"
      return semver.satisfies(vscodeVersion, engineRequirement);
    } catch (err) {
      if (!silent) {
        console.warn(`Error reading package.json for extension at ${extensionPath}:`, err.message);
      }
      return false;
    }
  }

  // Try to find extension directories
  try {
    // Only process if the directory exists
    if (fs.existsSync(extensionsDir)) {
      const extensions = fs.readdirSync(extensionsDir);
      
      for (const prefix of prefixArray) {
        try {
          // Use strict prefix matching with hyphen to ensure we only match the exact extension ID
          const exactMatches = extensions.filter(ext => 
            ext === prefix || // Exact match without version
            ext.startsWith(`${prefix}-`) // Prefix with version separator
          );
          
          if (exactMatches.length > 0) {
            // Get all extension paths
            const extensionPaths = exactMatches.map(ext => path.join(extensionsDir, ext));
            
            // Map to objects for sorting, applying compatibility filter if needed
            const compatibleExtensions = extensionPaths
              .filter(extPath => isExtensionCompatible(extPath))
              .map(extPath => {
                const dirName = path.basename(extPath);
                const versionMatch = dirName.substring(prefix.length + 1) || '0.0.0';
                return { path: extPath, version: versionMatch };
              });
            
            if (compatibleExtensions.length > 0) {
              // Sort by version (descending) to get latest version first
              compatibleExtensions.sort((a, b) => 
                semver.valid(semver.coerce(b.version)) && semver.valid(semver.coerce(a.version))
                  ? semver.compare(semver.coerce(b.version), semver.coerce(a.version))
                  : b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' })
              );
              
              // Take only the first (latest compatible) version
              foundExtensions.push(compatibleExtensions[0].path);
            } else if (!silent) {
              if (vscodeVersion && !skipVersionCheck) {
                console.log(`Note: No compatible version found for extension ${prefix} with VS Code ${vscodeVersion}`);
              } else {
                console.log(`Note: No versions found for extension ${prefix}`);
              }
            }
          } else if (!silent) {
            console.log(`Note: Extension ${prefix} not found`);
          }
        } catch (err) {
          if (!silent) {
            console.log(`Note: Error processing extension ${prefix}: ${err.message}`);
          }
          // Continue with next extension
        }
      }
    } else if (!silent) {
      console.log(`Note: Extensions directory not found at ${extensionsDir}`);
    }
    
    return foundExtensions;
  } catch (err) {
    if (!silent) {
      console.log(`Note: Error finding extensions: ${err.message}`);
    }
    return [];
  }
}

// Get VS Code versions to test with
const packageVersion = getEngineVersionFromPackageJson(); // From package.json (e.g., 1.71.2)
const stableVersion = 'stable'; // Latest stable version

// Determine which version to use based on environment variable
// Set VSCODE_TEST_VERSION=stable to use latest stable version
const useStableVersion = process.env.VSCODE_TEST_VERSION === 'stable';
const configVersion = useStableVersion ? stableVersion : packageVersion;

// Get extensions with compatibility checks
// Note: When using 'stable', we skip compatibility checks since the exact version is determined at runtime
const extensions = findVSCodeExtensions([
  'github.remotehub',
  'jbodart-argenx.vsce-lsaf-restapi-fs',
], { 
  vscodeVersion: useStableVersion ? null : packageVersion, 
  skipVersionCheck: useStableVersion,
  silent: true 
});

export default defineConfig({
  files: 'test/vscode/**/*.test.js',
  version: configVersion, // Either packageVersion or 'stable'
  workspaceFolder: './test-fixtures/test-fixtures.code-workspace',
  mocha: {
    ui: 'tdd',
    timeout: 30000,
  },
  extensionDevelopmentPath: [
    '.',
    '../vsce-lsaf-restapi-fs',
    ...extensions
  ],
  launchArgs: [
    `${path.resolve(__dirname, "test-fixtures/README.md").replace(/\\/g, '/')}`
	// '--disable-extensions',
  ],
  launchTestsTimeout: 30000
});
