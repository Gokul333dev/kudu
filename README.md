# 🌴 Kudu - A Tiny Git-Style Version Control System

**Kudu** is a simple version control CLI tool built with Node.js that mimics the core functionalities of Git. This is a basic V1 version designed for learning and experimentation. It tracks file versions, supports staging, commits, viewing logs, and allows basic diffing and checkout.

---

## 🎯 Features  

| Command      | Description                                                  | Example                    |
|--------------|--------------------------------------------------------------|----------------------------|
| `init`       | Initialize a new Kudu repository                             | `kudu init`                |
| `add`        | Stage files for commit                                       | `kudu add file.js`         |
| `commit`     | Commit staged changes with a message                         | `kudu commit "Message"`    |
| `log`        | View commit history                                          | `kudu log`                 |
| `status`     | Check current working directory status                       | `kudu status`              |
| `diff`       | Show changes between commits                                 | `kudu diff abc12`          |
| `checkout`   | Extract files from a commit into a new folder (non-destructive) | `kudu checkout abc12`   |

---

## 🚀 Getting Started

### 1. Clone or Download this Repo
```bash
git clone https://github.com/Gokul333dev/kudu.git
cd kudu
```

### 2. Make the CLI globally executable (optional for dev)
```bash
chmod +x kudu.js
```

### 3. Now You Can Run commands
```bash
node kudu.js <command> [arguments]
```
#### eg - node kudu init

#### Or if symlinked globally:
```bash
kudu <command> [arguments]
```

## 🛠️ Commands & Usage
### init
#### Initializes a .kudu directory in your current folder.
```bash
kudu init
```
Creates internal structure including objects, index, and HEAD.

### add <file> or add .
#### Adds a specific file to the staging area.
```bash
kudu add index.js
```
#### Or to add all non-ignored files recursively:
```bash
kudu add .
```
Automatically hashes file content and stores a reference in the .kudu/index.

### commit <message>
#### Commits staged changes with a message.
```bash
kudu commit "Initial commit"
```
Creates a commit object and updates the HEAD.

### log
#### Displays the commit history starting from the latest commit.
```bash
kudu log
```
Shows commit hash, date, and message recursively via parent references.

### status
#### Displays the status of files in your working directory.
```bash
kudu status
```
Tells you if a file is:
* ✅ Tracked and staged
* ⚠️ Tracked but modified
* ❓ Untracked

### diff <commit-hash>
#### Shows the differences (line-based) between a commit and its parent.
```bash
kudu diff <commit_hash>
```

Outputs added and removed lines with color:
 * + (green) for additions
 * - (red) for deletions


### checkout <commit-hash>
#### Creates a safe copy of files from a commit into a new folder.
```bash
kudu checkout <commit_hash>
```
✅ This does not replace your current working directory.
✅ It creates a folder named:

```bash 
./<first-5-characters-of-hash>/
```
Example
```bash
./a1b2c/
```
containing the files from that commit.

## 📂 .kuduignore
### You can add a .kuduignore file in your root directory to exclude files/folders from being tracked, similar to .gitignore.
#### Example
``` bash
# .kuduignore
node_modules/
.env
*.log
```

📌 Notes
 * Kudu is built with learning in mind — great for understanding how Git works internally.
 * It's not designed for production use or performance scaling.
 * All objects and commits are stored under .kudu/objects/ using SHA-1 hashes.
