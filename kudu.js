import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';

import { compress,decompress } from './utils/zlibHelper.js';

export class Kudu {
    constructor(repoPath='.'){
        this.repoPath = path.join(repoPath,'.kudu');
        this.objectsPath = path.join(this.repoPath,'objects');
        this.headPath = path.join(this.repoPath,'HEAD');
        this.indexPath=path.join(this.repoPath,'index');
    }


    async init(){
        await fs.mkdir(this.objectsPath,{recursive:true})

        try{
            await fs.writeFile(this.headPath,'',{flag:'wx'});
            await fs.writeFile(this.indexPath,JSON.stringify([]),{flag:'wx'});
            console.log(`Initialized an Empty Kudu Repository at ${this.repoPath}`);
        }
        catch(e){
            console.log("Repository Already Initialized");
        }
    }

    hash(content){
        return crypto.createHash('sha1').update(content,'utf-8').digest('hex');
    }

    async add(file){
        const content = await fs.readFile(file,{encoding:'utf-8'});
        const hashed_content= this.hash(content);

        const HashedContentPath = path.join(this.objectsPath,hashed_content);
        try{
            const compressed = await compress(content);
            await fs.writeFile(HashedContentPath,compressed,{flag:'wx'});
        }catch(e){
        }

        const relativePath = path.relative(process.cwd(),file);
        const normPath = relativePath.replace(/\\/g,'/');
        await this.addtostage(normPath,hashed_content);
    }


    async addtostage(path,file){
        let stagedFiles = JSON.parse(await fs.readFile(this.indexPath,{encoding:'utf-8'}));
        stagedFiles = stagedFiles.filter((item)=> item.path!==path)
        stagedFiles.push({path:path,file:file});
        await fs.writeFile(this.indexPath,JSON.stringify(stagedFiles));
    }

    async commit(commitMessage){
        const filesInStagingArea = JSON.parse(await fs.readFile(this.indexPath,{encoding:'utf-8'}));
        if(filesInStagingArea.length===0){
            console.log("Nothing To Commit! Add your files to the staging Area Before Commiting.")
            return;
        }
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            message : commitMessage,
            dateTime : new Date().toString(),
            files : filesInStagingArea,
            parent : parentCommit,
        }

        const commitHash = this.hash(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath,commitHash);
        try{
            await fs.writeFile(commitPath,JSON.stringify(commitData),{flag:'wx'});
            console.log(chalk.green(`✔ Commit successful: "${commitMessage}"`));
        }catch(e){
            console.log(chalk.red(`❌ Error Creating Commit !`));
        }
        await fs.writeFile(this.headPath,commitHash);
        await fs.writeFile(this.indexPath,JSON.stringify([]));
    }

    async getCurrentHead(){
        const head = await fs.readFile(this.headPath,{encoding:'utf-8'});
        return head ? head : null;
    }

    async log(){
        let currentCommit = await this.getCurrentHead();

        while(currentCommit){
            let currentCommitData = JSON.parse(await fs.readFile(path.join(this.objectsPath,currentCommit)));
            console.log(`\n=== Commit ${currentCommit} ===`);
            console.log(`Date: ${currentCommitData.dateTime}`);
            console.log(`Message: ${currentCommitData.message}\n`);
            currentCommit = currentCommitData.parent;
        }
    }

    async addAllFiles(dirpath){
        const ignored = await this.getIgnoredFiles();
        let addedFiles = 0;
        
        const traverse = async(dirpath)=> {
            const files = await fs.readdir(dirpath,{withFileTypes:true});
            
            for(const file of files){
                const filepath = path.join(dirpath,file.name);
                const relativePath = path.relative(process.cwd(),filepath);
                const normPath = relativePath.replace(/\\/g,'/');
    
                if(normPath === '.kudu' || normPath.includes('.kudu/')) continue;
                
                let shouldIgnore = false;
    
                for(const item of ignored){
                    if(this.matchPattern(normPath,item)){
                        shouldIgnore = true;
                        break;
                    }
                }
    
                if(shouldIgnore){
                    continue;
                }
                if(file.isDirectory()){
                    await traverse(filepath);
                }
                else if(file.isFile()){
                    await this.add(relativePath);
                    addedFiles++;
                }
            }
        }

        await traverse(dirpath);
    }

    async status(dirpath){
        const filesInStagingArea = JSON.parse(await fs.readFile(this.indexPath));
        const files = await fs.readdir(dirpath,{withFileTypes:true});
        const ignored = await this.getIgnoredFiles();

        for(const file of files){
            const filePath = path.join(dirpath,file.name);
            const relativePath = path.relative(process.cwd(),filePath);
            const normPath = relativePath.replace(/\\/g,'/');

            if(normPath.includes('.kudu/')|| normPath === '.kudu') continue;

            let shouldIgnore = false;

            for(const item of ignored){
                if(this.matchPattern(normPath,item.toLowerCase())){
                    shouldIgnore = true;
                    break;
                }
            }

            if(shouldIgnore){
                continue;
            }

            if(file.isDirectory()){
                await this.status(filePath);
            }

            else if(file.isFile()){
                const stagedFile = filesInStagingArea.find((entry) => entry.path===normPath);
                if(stagedFile){
                    const newFileContent = await fs.readFile(filePath,{encoding:'utf-8'});
                    const newFileHash = this.hash(newFileContent);
                    if(newFileHash === stagedFile.file){
                        console.log(`${file.name} is Tracked And Staged`);
                    }
                    else{
                        console.log(`${file.name} is Tracked but the changes Aren't Staged!`);
                    }
                    continue;
                }

                else{
                    console.log(`${file.name} is untracked`);
                }
            }
        }
    }

    async getCommitContent(commitHash){
        const pathToRead = path.join(this.objectsPath,commitHash);
        try{
        const commitContent = JSON.parse(await fs.readFile(pathToRead,{encoding:'utf-8'}));
        return commitContent;
        }
        catch(e){
            console.log(`Error reading commit ${commitHash}: ${e.message}`);
            return null;
        }
    }
    async getParentCommitContent(files,filePath){
        const contains = files.find((item)=>item.path==filePath);
        if(contains){
            const fileContent = await this.getFileContent(contains.file);
            return fileContent;
        }
    }

    async getFileContent(fileHash){
        const filePath = path.join(this.objectsPath,fileHash);
        try{
            const fileContent = await fs.readFile(filePath);
            return fileContent;
        }
        catch(e){
            console.log(`Error reading file object ${fileHash}: ${e.message}`);
        }
    }

    async diff(commitHash){
        const commitContent = await this.getCommitContent(commitHash);
        if(!commitContent){
            console.log(`Cannot diff: Commit ${commitHash} not found or corrupted.`);
            return;
        }
        const parentCommitContent = commitContent.parent ? await this.getCommitContent(commitContent.parent) : {files:[]};
        for(const file of commitContent.files){
            const fileContent = await this.getFileContent(file.file);
            const decompressed_fc = await decompress(fileContent);
            const decompressed_fc_str = decompressed_fc.toString('utf-8');
            const parentContent = await this.getParentCommitContent(parentCommitContent.files,file.path);
            const decompressed_pfc = await decompress(parentContent);
            const decompressed_pfc_str = decompressed_pfc.toString('utf-8');
            if(decompressed_pfc_str !== undefined){
                const diff = diffLines(decompressed_pfc_str,decompressed_fc_str,{ ignoreWhitespace: true });

                diff.forEach(element => {
                    if(element.removed){
                        process.stdout.write(chalk.red(`- ${element.value}\n`));
                    }
                    else if(element.added){
                        process.stdout.write(chalk.green(`+ ${element.value}\n`));
                    }
                });
            }
        }
    }

    matchPattern(file,pattern){
        const normFile = file.replace(/\\/g,'/');
        const normPattern = pattern.replace(/\\/g,'/');
        if(normPattern.endsWith('/')){
            return file.startsWith(normPattern.slice(0,-1));
        }
        return normFile===normPattern;
    }

    async getIgnoredFiles(){
        const kuduIgnorePath = path.join(process.cwd(),'.kuduignore');
        try{
            const data = await fs.readFile(kuduIgnorePath,{encoding:'utf-8'});

            const lines = data.split('\n').map((line)=>line.trim()).filter(line => line && !line.startsWith('#'));

            return lines;
        }
        catch(e){
            return [];
        }
    }

    async readFileFromPath(normpath){
        const relativePath = path.resolve(normpath.split('/').join(path.sep));

        try{
            const fileContent = await fs.readFile(relativePath);
            return fileContent;
        }catch(e){
            console.log(`Unable to read the fileContent ${e}`);
        }
    }

    async getFilesFromCommit(commitHash){
        const commitPath = path.join(this.objectsPath,commitHash);
        try{
            const commitData = JSON.parse(await fs.readFile(commitPath,{encoding:'utf-8'}));
            return commitData.files;
        }catch(e){
            console.log(`Error parsing commit data from ${commitHash}: ${e.message}`);
            return [];
        }
    }

    async writeFile(filePath,content){
        try{
            const dir = path.dirname(filePath);
            await fs.mkdir(dir,{recursive:true});
            await fs.writeFile(filePath,content,'utf-8');
        }catch(e){
            console.log(`Error writing to file ${filePath}: ${e.message}`);
        }
    }
    async checkout(commitHash){
        const files = await this.getFilesFromCommit(commitHash);
        const dirName = commitHash.slice(0,5);
        const checkoutPath = path.join(process.cwd(),dirName);
        try{
        await fs.mkdir(checkoutPath,{recursive:true});
        }catch(e){
            console.log(`Error Creating the Checkout Folder. Try running the command Again !`);
        }

        for(const file of files){
            const newPath = path.join(process.cwd(),dirName,file.path);
            const objectsContentPath = path.join(this.objectsPath,file.file);
            const content = await this.readFileFromPath(objectsContentPath);
            
            try{
                const decompressed = await decompress(content);

                if(!decompressed){
                    console.log(`Skipping ${file.path}: Decompressed content is empty or invalid.`);
                    continue;
                }
                await this.writeFile(newPath,decompressed);
            }catch(e){
                console.log(`Decompression or Writing Error for file ${file.path}: ${e.message}`);
                return;
            }
        }
        console.log(chalk.green(`✔ Successfully checked out commit files to folder: ${dirName}/`));
        console.log(`You can find them at: ${checkoutPath}`);
    }
}