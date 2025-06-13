import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


export const getVersion= async()=>{
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packageJSONPath = path.join(__dirname,'../package.json');
    const packageJSON = JSON.parse(await fs.readFile(packageJSONPath,{encoding:'utf-8'})).version;

    console.log(packageJSON);
}

