const vscode = require("vscode");
// const { getWebviewContent } = require("./webviewUtils");

// This is the async function that opens a webview and collects multi-line input from the user
// Even though the function does not use await, marking a function as async ensures it returns a promise.
// This can be useful if the function needs to be used in a context where a promise is expected.
async function getMultiLineText(defaultValue = '', info, getWebviewContent) {
   if (!getWebviewContent) {
      getWebviewContent = require("./webviewUtils").getWebviewContent;
   }
   let title = "Multi-Line Input";
   if (info && typeof info === 'string') {
      title = info;
   }
   return new Promise((resolve, reject) => {
      // Create and show a new webview panel
      const panel = vscode.window.createWebviewPanel(
         "multiLineInput", // Identifier for the panel
         title, // Panel title
         vscode.ViewColumn.One, // Display in editor column one
         {
         enableScripts: true, // Enable JavaScript in the webview
         }
      );

      console.log("Setting webview content with textValue:", defaultValue);

      // Set the content of the webview
      panel.webview.html = getWebviewContent(defaultValue, title);

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
         (message) => {
            console.log("Received message:", message);
            if (message.command === "submitText") {
               resolve(message.text); // Resolve the promise with the submitted text
               panel.dispose(); // Close the webview panel
            } else {
               reject("Unknown command");
            }
         },
         undefined,
         undefined
      );

      // If the panel is closed without submitting, resolve the promise with an empty string
      panel.onDidDispose(() => {
         resolve('');
      });
   });
}

// This is the async function that opens a webview and collects multi-line input from the user
// Even though the function does not use await, marking a function as async ensures it returns a promise.
// This can be useful if the function needs to be used in a context where a promise is expected.
async function showMultiLineText(textValue = '', title = "Text Content", header = "", buttonLabel = "Dismiss",
                                 preserveWhitespace = true, getWebviewContent = getWebviewContent) {
   const editable = false;
   // eslint-disable-next-line no-unused-vars
   return new Promise((resolve, reject) => {
      // Create and show a new webview panel
      const panel = vscode.window.createWebviewPanel(
         "multiLineText", // Identifier for the panel
         title, // Panel title
         vscode.ViewColumn.One, // Display in editor column one
         {
         enableScripts: true, // Enable JavaScript in the webview
         }
      );
      console.log("Setting webview content with textValue:", textValue);
      console.log("Panel created with title:", title);

      // Set the content of the webview
      panel.webview.html = getWebviewContent(textValue, title, header, buttonLabel, editable, preserveWhitespace);

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
         (message) => {
            if (message.command === "submitText") {
               resolve(message.text); // Resolve the promise with the submitted text
               panel.dispose(); // Close the webview panel
            }
         },
         undefined,
         undefined
      );

      // If the panel is closed without submitting, reject the promise
      panel.onDidDispose(() => {
         console.log("(showMultiLineText): Panel disposed without submitting");
         resolve(null);
      });
   });
}

// Export the function so it can be imported in other files
module.exports = {
   getMultiLineText,
   showMultiLineText
};
