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
| `diff`       | Show changes between given commit and parent commit                                | `kudu diff <commit_hash>`          |
| `checkout`   | Extract files from a commit into a new folder (non-destructive) | `kudu checkout <commit_hash>`   |

---

## 🚀 Getting Started

### Quick Test (Global Installation)
**Note** : Make sure you have node installed in your system. If not , Please Install node from [here](https://nodejs.org/en/download).  

To quickly test Kudu without cloning the repo:  

```bash
npm install -g kudu-vcs
```

### If you want to explore how Kudu works internally:

#### 1. Clone or Download this Repo
```bash
git clone https://github.com/Gokul333dev/kudu.git
cd kudu
```

#### 2. Make the CLI globally executable (optional for dev)
```bash
chmod +x kudu.js
```

#### 3. Now You Can Run commands
```bash
node kudu.js <command> [arguments]
```

Example:
```bash
node kudu init
```

If You want to run commands without mentioning "node" everytime, you need to change the execution policy in windows by running the following command:

```bash
Set-ExecutionPolicy Restricted -Scope CurrentUser
```

Or if symlinked globally:
```bash
kudu <command> [arguments]
```

## Commands & Usage

### init
Initializes a .kudu directory in your current folder.

```bash
kudu init
```

Creates internal structure including objects, index, and HEAD.

### add <file> or add .
Adds a specific file to the staging area.

```bash
kudu add index.js
```

Or to add all non-ignored files recursively:
```bash
kudu add .
```

Automatically hashes file content and stores a reference in the .kudu/index.

### commit <message>
Commits staged changes with a message.

```bash
kudu commit "Initial commit"
```

Creates a commit object and updates the HEAD.

### log
Displays the commit history starting from the latest commit.

```bash
kudu log
```

Shows commit hash, date, and message recursively via parent references.

### status
Displays the status of files in your working directory.

```bash
kudu status
```

Tells you if a file is:
- Tracked and staged
- Tracked but modified
- Untracked

### diff <commit-hash>
Shows the differences (line-based) between a commit and its parent.

```bash
kudu diff <commit_hash>
```

Outputs added and removed lines with color:
* + (green) for additions
* - (red) for deletions

### checkout <commit-hash>
Creates a safe copy of files from a commit into a new folder.

```bash
kudu checkout <commit_hash>
```

This does not replace your current working directory. It creates a folder named:

```bash 
./<first-5-characters-of-hash>/
```

Example:
```bash
./a1b2c/
```

containing the files from that commit.

## 📂 .kuduignore
You can add a .kuduignore file in your root directory to exclude files/folders from being tracked, similar to .gitignore.

Example:
```bash
# .kuduignore
node_modules/
.env
```

## 🔒 Compression Format
Kudu uses a custom compression format based on zlib's deflate algorithm. All stored file contents are compressed before being saved to the .kudu/objects directory.

- Each compressed file is prefixed with a 3-byte custom header: KZ1
- This allows Kudu to identify and validate compressed objects during decompression
- Decompression is handled using zlib.inflate after verifying the KZ1 header

This lightweight scheme ensures efficient storage and fast retrieval, while keeping the system simple and easy to modify.

## 📌 Notes
- Kudu is built with learning in mind — great for understanding how Git works internally.
- It's not designed for production use or performance scaling.
- All objects and commits are stored under .kudu/objects/ using SHA-1 hashes.
