#!/usr/bin/env node

import { Kudu } from "./kudu.js";
import process from 'process';
import { getVersion } from "./cli/version.js";

const kudu = new Kudu();

const [,, cmd,...args] = process.argv;

(async()=>{
    switch(cmd){
        case 'init':
            await kudu.init();
            break;
        case 'add':
            if(args[0]=='.'){
                await kudu.addAllFiles('.');
                break;
            }
            await kudu.add(args[0]);
            break;
        case 'commit':
            await kudu.commit(args.join(' '));
            break;
        case 'log':
            await kudu.log();
            break;
        case 'status':
            await kudu.status('.');
            break;
        case 'diff':
            await kudu.diff(args[0]);
            break;
        case "checkout":
            await kudu.checkout(args[0]);
            break;
        case "-v":
            await getVersion();
            break;
        case "--version":
            await getVersion();
            break;
        default:
            console.log("Unknow Command");
    }
})();