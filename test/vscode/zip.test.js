const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const glob = require('glob');
const { createZip, extractZip } = require('../../src/zip');

suite('zip.js Integration Tests', () => {
    let expect;
    let tempDir;
    let testFilePath1, testFilePath2, zipFilePath, extractDir;

    suiteSetup(async () => {
        // Dynamically import chai and set up expect
        const chai = await import('chai');
        expect = chai.expect;
        
        // Create a temporary directory for our test files
        tempDir = path.join(os.tmpdir(), `vscode-lsaf-tools-test-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Create test files
        testFilePath1 = path.join(tempDir, 'test-file1.txt');
        testFilePath2 = path.join(tempDir, 'test-file2.txt');
        fs.writeFileSync(testFilePath1, 'test content 1');
        fs.writeFileSync(testFilePath2, 'test content 2');
        
        // Define zip and extract paths
        zipFilePath = path.join(tempDir, 'test-archive.zip');
        extractDir = path.join(tempDir, 'extracted');
        fs.mkdirSync(extractDir, { recursive: true });
    });
    
    suiteTeardown(async () => {
        // Clean up temp files
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) {
            console.error(`Failed to clean up temp directory: ${err.message}`);
        }
    });

    test('createZip should create a zip file', async () => {
        const sources = [
            vscode.Uri.file(testFilePath1), 
            vscode.Uri.file(testFilePath2)
        ];
        
        try {
            await createZip(sources, zipFilePath);
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(zipFilePath));
            expect(stat).to.not.be.undefined;
            expect(stat.size).to.be.greaterThan(0);
        } catch (err) {
            expect.fail(`createZip failed: ${err.message}`);
        }
    });

    test('extractZip should extract a local zip file', async () => {
        // First make sure we have a zip file to extract
        if (!fs.existsSync(zipFilePath)) {
            const sources = [
                vscode.Uri.file(testFilePath1), 
                vscode.Uri.file(testFilePath2)
            ];
            await createZip(sources, zipFilePath);
        }
        
        try {
            await extractZip(vscode.Uri.file(zipFilePath), vscode.Uri.file(extractDir));
            
            // Check that files were extracted
            const extractedFiles = fs.readdirSync(extractDir);
            expect(extractedFiles).to.not.be.empty;
            
            // Verify content of extracted files
            const extractedFile1 = path.join(extractDir, path.basename(testFilePath1));
            if (fs.existsSync(extractedFile1)) {
                const content = fs.readFileSync(extractedFile1, 'utf8');
                expect(content).to.equal('test content 1');
            }
        } catch (err) {
            expect.fail(`extractZip failed: ${err.message}`);
        }
    });

    /**
     * Helper function to check system requirements for LSAF integration tests
     * and generate a detailed diagnostic report
     */
    async function checkLsafSystemRequirements() {
        const report = {
            timestamp: new Date().toISOString(),
            vscodeVersion: vscode.version,
            nodeVersion: process.version,
            platform: process.platform,
            extensionsFound: [],
            lsafExtension: null,
            extensionActivationResult: null,
            remoteSchemes: [],
            canAccessRemoteFile: false,
            diagnosticMessages: []
        };
        
        // Log diagnostic message
        const logDiagnostic = (message) => {
            console.log(message);
            report.diagnosticMessages.push(message);
        };
        
        logDiagnostic("\n=== LSAF INTEGRATION TEST DIAGNOSTICS ===");
        logDiagnostic(`Running in VS Code ${vscode.version} on ${process.platform}`);
        
        // Check installed extensions
        const allExtensions = vscode.extensions.all;
        report.extensionsFound = allExtensions.map(ext => ({
            id: ext.id,
            isActive: ext.isActive,
            version: ext.packageJSON?.version || 'unknown'
        }));
        
        const lsafRelatedExtensions = allExtensions.filter(ext => 
            ext.id.toLowerCase().includes('lsaf') || 
            (ext.packageJSON?.contributes?.resourceLabelFormatters?.some(f => f.scheme?.includes('lsaf')))
        );
        
        if (lsafRelatedExtensions.length > 0) {
            logDiagnostic(`Found ${lsafRelatedExtensions.length} LSAF-related extensions:`);
            lsafRelatedExtensions.forEach(ext => {
                logDiagnostic(`- ${ext.id} (${ext.isActive ? 'active' : 'inactive'}, v${ext.packageJSON?.version || 'unknown'})`);
            });
        } else {
            logDiagnostic("No LSAF-related extensions found.");
        }
        
        // Check for specific extension
        const targetExtension = vscode.extensions.getExtension('jbodart-argenx.vsce-lsaf-restapi-fs');
        if (targetExtension) {
            report.lsafExtension = {
                id: targetExtension.id,
                isActive: targetExtension.isActive,
                version: targetExtension.packageJSON?.version || 'unknown'
            };
            logDiagnostic(`Found required extension: ${targetExtension.id} (${targetExtension.isActive ? 'active' : 'inactive'}, v${targetExtension.packageJSON?.version || 'unknown'})`);
            
            // Try activating if not active
            if (!targetExtension.isActive) {
                logDiagnostic("Attempting to activate extension...");
                try {
                    await targetExtension.activate();
                    report.extensionActivationResult = 'success';
                    logDiagnostic("Extension activated successfully!");
                } catch (err) {
                    report.extensionActivationResult = {
                        success: false,
                        error: err.message,
                        stack: err.stack
                    };
                    logDiagnostic(`Failed to activate extension: ${err.message}`);
                }
            } else {
                report.extensionActivationResult = 'already-active';
                logDiagnostic("Extension is already active.");
            }
        } else {
            logDiagnostic("Required extension 'jbodart-argenx.vsce-lsaf-restapi-fs' not found.");
            logDiagnostic("Please install the extension and try again.");
        }
        
        // Check for registered URI schemes
        try {
            // This is a speculative check since we don't know exactly how schemes are registered
            // Try different approaches to detect registered URI schemes
            const schemesList = [];
            
            // Try direct access if available
            if (vscode.workspace.registerTextDocumentContentProvider && 
                typeof vscode.workspace.registerTextDocumentContentProvider === 'function') {
                const provider = vscode.workspace.registerTextDocumentContentProvider;
                if (provider.keys && typeof provider.keys === 'function') {
                    schemesList.push(...Array.from(provider.keys()));
                }
            }
            
            // Check file system providers if available
            if (vscode.workspace.fs && vscode.workspace.fs.registerProvider) {
                const fsProviders = vscode.workspace.fs.registerProvider;
                if (fsProviders.keys && typeof fsProviders.keys === 'function') {
                    schemesList.push(...Array.from(fsProviders.keys()));
                }
            }
            
            report.remoteSchemes = schemesList;
            if (schemesList.length > 0) {
                logDiagnostic(`Registered URI schemes: ${schemesList.join(', ')}`);
                if (schemesList.includes('lsaf-repo')) {
                    logDiagnostic("Found 'lsaf-repo' scheme, which is required for testing.");
                } else {
                    logDiagnostic("Warning: 'lsaf-repo' scheme not found among registered schemes.");
                }
            } else {
                logDiagnostic("No URI schemes could be detected. This might be a limitation of the test environment.");
            }
        } catch (err) {
            logDiagnostic(`Error checking URI schemes: ${err.message}`);
        }
        
        // Try to check if remote file exists
        try {
            const remoteZipFileUri = vscode.Uri.parse('lsaf-repo://xarprod/general/biostat/macros/testing/dat/test_data.zip');
            logDiagnostic(`Testing access to remote file: ${remoteZipFileUri.toString()}`);
            
            const startTime = Date.now();
            await vscode.workspace.fs.stat(remoteZipFileUri);
            const endTime = Date.now();
            
            report.canAccessRemoteFile = true;
            logDiagnostic(`Successfully accessed remote file (took ${endTime - startTime}ms)`);
        } catch (err) {
            report.canAccessRemoteFile = false;
            logDiagnostic(`Failed to access remote file: ${err.message}`);
        }
        
        logDiagnostic("\n=== CONCLUSION ===");
        if (report.lsafExtension && report.extensionActivationResult && 
            (report.extensionActivationResult === 'success' || report.extensionActivationResult === 'already-active') && 
            report.canAccessRemoteFile) {
            logDiagnostic("✅ All prerequisites met for running LSAF integration tests");
        } else {
            logDiagnostic("❌ Prerequisites not met for running LSAF integration tests");
            if (!report.lsafExtension) {
                logDiagnostic("  - Required extension not installed");
            } else if (!report.extensionActivationResult || 
                      (report.extensionActivationResult !== 'success' && report.extensionActivationResult !== 'already-active')) {
                logDiagnostic("  - Extension failed to activate");
            }
            if (!report.canAccessRemoteFile) {
                logDiagnostic("  - Cannot access remote test file");
            }
        }
        
        return report;
    }
    
    test('extractZip should extract a remote zip file', async function() {
        // Use existing remote zip file lsaf-repo://xarprod/general/biostat/macros/testing/dat/test_data.zip
        // or vscode-vfs://github/argenxQuantitativeSciences/macros/testing/dat/test_data.zip
        // containing:
        // - test_data/ae.sas7bdat
        // - test_data/dm.sas7bdat
        // - test_data/suppae.sas7bdat
        // - test_data/suppdm.sas7bdat
        this.timeout(1200000);  // Increase timeout for remote extraction

        // Run diagnostics to check system requirements
        const diagnostics = await checkLsafSystemRequirements();

        // Skip test if prerequisites aren't met
        if (!diagnostics.lsafExtension) {
            console.warn('Required extension "jbodart-argenx.vsce-lsaf-restapi-fs" is not installed.');
            this.skip('Required extension "jbodart-argenx.vsce-lsaf-restapi-fs" is not installed.');
            return;
        }
        
        if (diagnostics.extensionActivationResult !== 'success' && 
            diagnostics.extensionActivationResult !== 'already-active') {
            console.warn(`Failed to activate required extension: ${JSON.stringify(diagnostics.extensionActivationResult)}`);
            this.skip(`Failed to activate required extension: ${JSON.stringify(diagnostics.extensionActivationResult)}`);
            return;
        }
        
        if (!diagnostics.canAccessRemoteFile) {
            console.warn('Cannot access remote test file. Check your connection or permissions.');
            this.skip('Cannot access remote test file. Check your connection or permissions.');
            return;
        }

        try {
            // Wait a bit for extension to fully initialize if just activated
            if (diagnostics.extensionActivationResult === 'success') {
                console.log("\nWaiting for LSAF extension to be ready after activation...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                console.log("LSAF extension should be ready now.");
            }
            
            // Create output directory
            const outputDirUri = vscode.Uri.file(path.join(tempDir, 'remote-extracted'));
            fs.mkdirSync(outputDirUri.fsPath, { recursive: true });
            
            // Remote zip file URI
            const remoteZipFileUri = vscode.Uri.parse('lsaf-repo://xarprod/general/biostat/macros/testing/dat/test_data.zip');
            // const remoteZipFileUri = vscode.Uri.parse('vscode-vfs://github/argenxQuantitativeSciences/macros/testing/dat/test_data.zip');
            // const remoteZipFileUri = vscode.Uri.parse('file:///c:/Users/jbodart/lsaf/files/general/biostat/macros/testing/dat/test_data.zip');
            console.log(`Extracting remote zip file from: ${remoteZipFileUri} ...`);
            
            // Extract the remote zip file
            await extractZip(remoteZipFileUri, outputDirUri, false);
            
            // Give the file system a moment to complete all writes
            console.log("Give the file system a moment to complete all writes...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Use glob to find all files recursively
            const extractedFiles = glob.sync('**/*', { 
                cwd: outputDirUri.fsPath,
                nodir: false  // Include directories in results
            }).map(file => file.replace(/\\/g, '/')); // Normalize path separators for consistency
            
            console.log('Extracted files from remote zip:', extractedFiles);
            
            // Verify extracted files
            expect(extractedFiles).to.not.be.empty;
            expect(extractedFiles).to.include('test_data');
            expect(extractedFiles).to.include('test_data/ae.sas7bdat');
            expect(extractedFiles).to.include('test_data/dm.sas7bdat');
            expect(extractedFiles).to.include('test_data/suppae.sas7bdat');
            expect(extractedFiles).to.include('test_data/suppdm.sas7bdat');
            expect(extractedFiles.length).to.equal(5); // 4 files + 1 directory
        } catch (err) {
            console.log(`\n=== TEST EXECUTION ERROR ===`);
            console.log(`Error: ${err.message}`);
            console.log(`Stack: ${err.stack}`);
            throw err;
        }
    });
});



// Run this test file only with the command:
// npm run test:vscode -- --include zip.test.js
// or with the command:
// npm run test:vscode -- --include zip.test.js --extensionDevelopmentPath=./ --extensionTestsPath=./test/vscode/zip.test.js