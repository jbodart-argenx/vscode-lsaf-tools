// filepath: /c:/Users/jbodart/JSproj/vsce-lsaf-restapi-fs/run-lint.js
const { exec } = require('child_process');
const fs = require('fs');

const outputFile = 'lint-output.txt';
const maxLines = 100;

const lintProcess = exec('npm run lint', (error, stdout, stderr) => {
   if (error) {
      console.error(`Error: ${error.message}`);
      return;
   }
   if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
   }

   // Write the full output to the file
   fs.writeFileSync(outputFile, stdout);

   // Display the first 100 lines of the output
   const lines = stdout.split('\n').slice(0, maxLines);
   console.log(lines.join('\n'));
});

lintProcess.stdout.pipe(process.stdout);
lintProcess.stderr.pipe(process.stderr);