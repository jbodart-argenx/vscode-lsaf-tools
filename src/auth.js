const beautify = require('js-beautify');
const vscode = require('vscode');
const { axios } = require('./axios-cookie-jar.js');

const authTokens = {};

function setAuthToken(key, value) {
   authTokens[key] = value;
}

function getAuthToken(key) {
   return authTokens[key];
}

function deleteAuthTokens(key) {
   if (key === '*') {
      const keys = Object.getOwnPropertyNames(authTokens);
      keys.forEach(key => {
         delete authTokens[key];
      });
   }
   delete authTokens[key];
}

let secretStorage;

function initializeSecretModule(storage) {
   secretStorage = storage;
}

class CredentialStore {
   constructor() {
      this.app = 'vscode-lsaf-tools';
   }

   async GetCredential(key) {
      try {
         const jsonCreds = await secretStorage.get(key);
         if (!jsonCreds) return null;
         const creds = JSON.parse(jsonCreds);
         const newCreds = {
            newCredentials: false,
            _username: creds.username,
            _password: creds.password,
         };
         return newCreds;
      } catch (error) {
         console.error(error.message);
      }
   }

   async SetCredential(key, username, password) {
      await secretStorage.store(key, JSON.stringify({ username, password }));
   }

   async DeleteCredential(key) {
      await secretStorage.delete(key);
   }
}

const credStore = new CredentialStore();

const EMPTY_CREDENTIALS = {
   newCredentials: true,
   _username: "",
   _password: "",
};

async function getCredentials(key) {
   let credentials;
   try {
      credentials = await credStore.GetCredential(key);
      if (credentials?._username && credentials?._password) {
         return credentials;
      } else {
         credentials = await askForCredentials(key);
         return credentials;
      }
   } catch (error) {
      console.error(error.message);
   }
}

async function askForCredentials(key) {
   try {
      const username = await vscode.window.showInputBox({
         prompt: "Username for " + key + " ?",
         ignoreFocusOut: true,
      });
      if (!username) {
         return EMPTY_CREDENTIALS;
      }

      const password = await vscode.window.showInputBox({
         prompt: "Password ?",
         password: true,
         ignoreFocusOut: true,
      });
      if (!password) {
         return EMPTY_CREDENTIALS;
      }

      return {
         newCredentials: true,
         _username: username,
         _password: password,
      };
   } catch (error) {
      console.error(error.message);
   }
}

async function storeCredentials(key, username, password) {
   await credStore.SetCredential(key, username, password);
}

async function deleteCredentials(key) {
   if (key == null) {
      key = await vscode.window.showInputBox({
         title: "Delete credentials for host name",
         prompt: "Enter fully qualified host name (e.g. 'example.ondemand.sas.com')\n",
         ignoreFocusOut: true,
      });
   }
   if (!key) throw new Error('deleteCredentials: no hostname provided, aborting.');
   try {
      if (getAuthToken(key)) {
         deleteAuthTokens(key);
         console.log(`Host ${key} auth token deleted.`);
      }
      if (!(await getCredentials(key))?._password) {
         vscode.window.showErrorMessage(`deleteCredentials: No credentials saved for Host "${key}", aborting.`);
         return;
      }
      await credStore.DeleteCredential(key);
      const shortkey = String(key).split('.')[0];
      if (process.env[`${shortkey}_encpasswd`]) {
         delete process.env[`${shortkey}_encpasswd`];
         console.log(`Deleted environment variable: "${shortkey}_encpasswd"`);
      } else {
         console.log(`Environment variable "${shortkey}_encpasswd" does not exist.`);
      }
      if (process.env[`${shortkey}_passwd`]) {
         delete process.env[`${shortkey}_passwd`];
         console.log(`Deleted environment variable: "${shortkey}_passwd"`);
      } else {
         console.log(`Environment variable "${shortkey}_passwd" does not exist.`);
      }
      const credentials = await credStore.GetCredential(key);
      if (credentials == null) {
         console.log(`Host ${key} credentials successfully deleted.`);
         vscode.window.showInformationMessage(`Host "${key}" credentials were successfully deleted.`);
      } else {
         console.error(`Host ${key} credentials were NOT deleted!`);
         vscode.window.showErrorMessage(`Failed to delete Host ${key} credentials!`);
      }
   } catch (error) {
      if (error) {
         console.error(`Error deleting Host "${key}" credentials: ${error.message}`);
         vscode.window.showErrorMessage(`Error deleting Host "${key}" credentials: ${error.message}`);
      }
   }
}

async function logon(host, username, password, retry = true) {
   let authToken, encryptedPassword;
   if (typeof host !== 'string' || host.trim().length === 0) {
      host = await vscode.window.showInputBox({
         prompt: "Host name ?",
         ignoreFocusOut: true,
      });
      if (!host) throw new Error("logon error: 'host' parameter must be specified");
   }
   authToken = getAuthToken(host);
   if (authToken) {
      const url = `https://${host}/lsaf/api/workspace/folders/?component=children`;
      try {
         const response = await axios.get(url, {
            headers: { "X-Auth-Token": authToken },
         });
         if (response.status !== 401) {
            console.log(response.status, response.statusText);
            if (response.status === 200) {
               setAuthToken(host, authToken);
               return;
            } else {
               console.log(`(logon): Unexpected HTTP response status ${response.status} ${response.statusText}:`);
               response.headers.forEach((value, name) => {
                  console.log(`${name}: ${value}`);
               });
               if (response.header['content-type'].match(/\bjson\b/)) {
                  const data = response.data;
                  console.log(beautify(JSON.stringify(data), {
                     indent_size: 2,
                     space_in_empty_paren: true,
                  }));
               }
            }
         } else {
            deleteAuthTokens(host);
            return logon(host);
         }
      } catch (err) {
         console.log(`(logon) Error: ${err}`);
         if (err.code === "ECONNRESET" && retry) {
            console.log(`(logon) ECONNRESET: ${err}`);
            return logon(host);
         }
         deleteAuthTokens(host);
         return logon(host);
      }
   }
   if (typeof username === 'string'
      && typeof password === 'string'
      && username.trim().length > 1
      && password.trim().length > 6
   ) {
      encryptedPassword = await encryptPassword(host, username, password);
   }
   if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      const creds = await getCredentials(host);
      const { _username, _password: password } = creds;
      if (typeof _username === 'string'
         && typeof password === 'string'
         && _username.trim().length > 1
         && password.trim().length > 6
      ) {
         username = _username;
         encryptedPassword = await encryptPassword(host, username, password);
      } else {
         const creds = await askForCredentials(host);
         const { _username, _password: password } = creds;
         if (typeof _username === 'string'
            && typeof password === 'string'
            && _username.trim().length > 1
            && password.trim().length > 6
         ) {
            username = _username;
            encryptedPassword = await encryptPassword(host, username, password);
         } else {
            encryptedPassword = null;
            if (typeof _username === 'string' && _username.trim().length > 0) return logon(host, _username);
         }
      }
      if (typeof encryptedPassword !== 'string') {
         throw new Error('No encrypted password, aborting logon.');
      }
   }
   const url = `https://${host}/lsaf/api/logon`;
   try {
      let response = await axios.post(url, {}, {
         headers: {
            "Authorization": "Basic " + Buffer.from(username + ":" + encryptedPassword).toString('base64'),
         },
      });
      if (response.status === 200) {
         const authToken = response.headers["x-auth-token"];
         console.log("authToken", authToken, "response", response);
         console.log(`Storing Auth Token for host ${host}: ${authToken}`);
         setAuthToken(host, authToken);
         await storeCredentials(
            host,
            username,
            encryptedPassword
         );
         return authToken;
      } else {
         console.log(`${response.status} ${response.statusText}`);
         const text = response.data;
         console.log('response text:', text);
         throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      }
   } catch (error) {
      if (error?.response?.status === 401) {
         if (`${error.response?.data?.message}`.match(/credentials.*incorrect/i)) {
            try {
               encryptedPassword = null;
               const credentials = await askForCredentials(host);
               if (typeof credentials._username === 'string'
                  && typeof credentials._password === 'string'
                  && credentials._username.trim().length > 1
                  && credentials._password.trim().length > 6
               ) {
                  username = credentials._username;
                  encryptedPassword = await encryptPassword(host, username, credentials._password);
                  if (typeof encryptedPassword === 'string') {
                     return logon(host, username, encryptedPassword);
                  }
               } else {
                  return logon(host);
               }
            } catch (error) {
               console.log(error);
            }
         }
      }
      console.error('Error fetching x-auth-token:', error);
   }
}

async function encryptPassword(host, username, password) {
   const url = `https://${host}/lsaf/api/encrypt`;
   console.log('password:', String(password).replaceAll(/\w/g, '*'));
   if (password === '') {
      console.error('encryptPassword(): no password provided, aborting.');
      return null;
   }
   if (password.toString().slice(0, 5) === '{P21}') {
      return password; // already encrypted
   }
   try {
      const response = await axios.get(url, {
         headers: {
            'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
         },
      });
      if (response.status === 401) {
         // Unauthorized
      } else if (response.status !== 200) {
         throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      }
      const result = response.data;
      console.log('(encryptPassword) result:', String(result).replaceAll(/[\w]/g, '*'));
      return result;
   } catch (error) {
      console.error('Error fetching encrypted password:', error);
   }
}

module.exports = {
   setAuthToken,
   getAuthToken,
   deleteAuthTokens,
   initializeSecretModule,
   CredentialStore,
   credStore,
   EMPTY_CREDENTIALS,
   getCredentials,
   askForCredentials,
   storeCredentials,
   deleteCredentials,
   logon,
   encryptPassword
};
