function getWebviewContent(defaultValue, title = "File Upload Comment", header = undefined, buttonLabel = "Submit", editable = true, preserveWhitespace = false) {
   if (!header) header = `Enter ${title} below:`;
   const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
   const escapedHeader = header.replace(/</g, '&lt;').replace(/>/g, '&gt;');
   const escapedValue = `${defaultValue || ''}`.replace(/</g, '&lt;').replace(/>/g, '&gt;');
   const escapedButtonLabel = buttonLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;');
   const readonly = editable ? "" : "readonly";

   return `
   <!DOCTYPE html>
   <html lang="en">
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>${escapedTitle}</title>
         <style>
            body {
               display: flex;
               flex-direction: column;
               margin: 0;
               height: 100vh;
               box-sizing: border-box;
               font-family: ${preserveWhitespace ? 'monospace;' : 'sans-serif'};
               ${preserveWhitespace && 'white-space: pre-wrap;'}
            }
            textarea {
               flex: 1;
               box-sizing: border-box;
               font-family: ${preserveWhitespace ? 'monospace;' : 'sans-serif'};
               ${preserveWhitespace && 'white-space: pre-wrap;'}
            }
            .controls {
               margin-top: 10px;
            }
         </style>
      </head>
      <body>
         <h2>${escapedHeader}</h2>
         <textarea id="inputText" ${readonly}>${escapedValue}</textarea>
         <div class="controls">
            <button onclick="submitText()">${escapedButtonLabel}</button>
         </div>

         <script>
            const vscode = acquireVsCodeApi();
            function submitText() {
               const text = document.getElementById('inputText').value;
               vscode.postMessage({ command: 'submitText', text });
            }
         </script>
      </body>
   </html>
   `;
}

module.exports = { getWebviewContent };
