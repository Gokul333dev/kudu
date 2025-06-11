#!/usr/bin/env node

import { Kudu } from "./git.js";
import process from 'process';

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
        case 'ignore':
            console.log(await kudu.getIgnoredFiles());
            break;
        default:
            console.log("Unknow Command");
    }
})();