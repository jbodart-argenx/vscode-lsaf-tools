const axiosNative = require('axios');
const { CookieJar } = require('tough-cookie');
// Replace require with dynamic import for ES module
let axios;

// Initialize axios with cookie jar support
async function setupAxios() {
    const { wrapper } = await import('axios-cookiejar-support');
    
    // Create a new cookie jar
    const jar = new CookieJar();
    
    // Wrap the native axios instance with cookie support
    axios = wrapper(axiosNative.create({
        jar,
        withCredentials: true
    }));
    
    return axios;
}

// Export both the axios promise and setup function
module.exports = { 
    setupAxios,
    axiosPromise: setupAxios() 
};
