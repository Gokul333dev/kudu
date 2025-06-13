import {promisify} from 'util';
import { deflate,inflate } from 'zlib';

export const deflateAsync = promisify(deflate);
export const inflateAsync = promisify(inflate);

export async function compress(content) {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content,'utf-8');
    const compressed =  await deflateAsync(buffer);
    const final = Buffer.concat([Buffer.from('KZ1'),compressed]);
    return final;
}

export async function decompress(content){
    const header = content.slice(0,3).toString();
    if(header==='KZ1'){
        try{
            const decompressed = await inflateAsync(content.slice(3));
            return decompressed;
        }catch(e){
            console.log(`Unable to decompress the file : ${e.message}`);
            return content;
        }
    }
    else{
        console.log("Unknown Compressed Header.Not a kz1 File.")
    }
}

