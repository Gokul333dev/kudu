import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';

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
            console.log("Initialized an Empty Kudu Repository");
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
            await fs.writeFile(HashedContentPath,content,{flag:'wx'});
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
        }catch(e){
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
            console.log(`Message: ${currentCommitData.message}`);
            currentCommit = currentCommitData.parent;
        }
    }

    async addAllFiles(dirpath){
        const ignored = await this.getIgnoredFiles();
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
                await this.addAllFiles(filepath);
            }
            else if(file.isFile()){
                await this.add(relativePath);
            }
        }
    }

    async status(dirpath){
        const filesInStagingArea = JSON.parse(await fs.readFile(this.indexPath));
        // filesInStagingArea.map((item)=>console.log(item.path));
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
                    // console.log(newFileHash);
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
            console.log("Encountered An Error!");
        }
    }
    async getParentCommitContent(files,filePath){
        const contains = files.find((item)=>item.path==filePath);
        if(contains){
            // return contains;
            const fileContent = await this.getFileContent(contains.file);
            return fileContent;
        }
    }

    async getFileContent(fileHash){
        const filePath = path.join(this.objectsPath,fileHash);
        try{
            const fileContent = await fs.readFile(filePath,{encoding:'utf-8'});
            return fileContent;
        }
        catch(e){
            console.log(e);
        }
    }

    async diff(commitHash){
        const commitContent = await this.getCommitContent(commitHash);
        const parentCommitContent = commitContent.parent ? await this.getCommitContent(commitContent.parent) : {files:[]};
        for(const file of commitContent.files){
            const fileContent = await this.getFileContent(file.file);
            const parentContent = await this.getParentCommitContent(parentCommitContent.files,file.path);
            if(parentContent !== undefined){
                const diff = diffLines(parentContent,fileContent);

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
            const fileContent = await fs.readFile(relativePath,{encoding:'utf-8'});
            return fileContent;
        }catch(e){
            console.log(`Unable to read the fileContent ${e}`);
        }
    }

    async getFilesFromCommit(commitHash){
        const commitPath = path.join(this.objectsPath,commitHash);

        const commitData = JSON.parse(await fs.readFile(commitPath,{encoding:'utf-8'}));

        return commitData.files;
    }

    async writeFile(filePath,content){
        const dir = path.dirname(filePath);
        await fs.mkdir(dir,{recursive:true});
        await fs.writeFile(filePath,content,'utf-8');
    }
    async checkout(commitHash){
        const files = await this.getFilesFromCommit(commitHash);
        const checkoutPath = path.join(process.cwd(),'checkout');
        try{
        await fs.mkdir(checkoutPath,{recursive:true});
        }catch(e){
            console.log(e);
        }

        for(const file of files){
            const newPath = path.join(process.cwd(),'checkout',file.path);
            // console.log(newPath);
            const content = await this.readFileFromPath(file.path);

            try{
                await this.writeFile(newPath,content);
            }catch(e){
                console.log(`Error : ${e}`);
            }
        }
    }
}

// (
//     async ()=>{
//         const kudu = new Kudu();
//         await kudu.checkout('f0def0c25d928afb6a9b08f0bdbb8f3697ce3428');
//     }
// )();