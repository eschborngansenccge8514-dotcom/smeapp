const { pathToFileURL } = require('url');
const path = require('path');
const configPath = path.resolve('C:/Users/User/Downloads/smeapp/my-marketplace/apps/mobile/metro.config.js');
console.log('Testing import of:', configPath);
import(pathToFileURL(configPath).href).then(m => {
  console.log('Import successful');
}).catch(err => {
  console.error('Import failed:', err);
});
