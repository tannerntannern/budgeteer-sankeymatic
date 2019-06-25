const fs = require('fs');
const path = require('path');

const resourcesTypesPath = path.resolve(__dirname, '../node_modules/@tannerntannern/budgeteer/dist/resources.d.ts');
const indexPath = path.resolve(__dirname, '../src/index.js');

let resourcesTypesText = fs.readFileSync(resourcesTypesPath, 'utf8');
resourcesTypesText = resourcesTypesText.replace(/import\s+.+from\s+'[^']+';/g, '');
resourcesTypesText = resourcesTypesText.replace(/export\s+\{[^}]+\};/g, '');

let indexText = fs.readFileSync(indexPath, 'utf8');
indexText = indexText.replace(/(\/\/\s\<TYPES\-START\>\s*\n)([\s\S]+)(\s*\n\/\/\s\<TYPES\-END\>)/, `$1${resourcesTypesText}$3`);

fs.writeFileSync(indexPath, indexText);
