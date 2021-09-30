import fs from "fs";
import http from "http";
import https from "https";
import unzipper from 'unzipper';
import path from "path";
import git from "simple-git";

export const LOCAL_DIR = "public/custom/";
export const AWS_URL = "https://assets.ortype.is/";
export const REMOTE_URL = "http://assets.ortype.is/fonts/";

/**
 * @summary Downloads remote URL to local disk
 * @param {String} url: Remote URL
 * @param {String} dest: Destination path
 * @returns {undefined}
 */
export function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = (new URL(url)).protocol==='http' ? http:https;
    checkDir(dest);
    const request = client.get(url, (response) => {
      if (response.statusCode===200) {
        response.pipe(file);
      } else {
        file.close();
        fs.unlink(dest, () => {
        }); // Delete temp file
        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
      }
    });

    request.on("error", (err) => {
      file.close();
      fs.unlink(dest, () => {
      }); // Delete temp file
      reject(err.message);
    });

    file.on("finish", () => {
      resolve(true);
    });

    file.on("error", (err) => {
      file.close();

      if (err.code==="EEXIST") {
        reject("File already exists");
      } else {
        fs.unlink(dest, () => {
        }); // Delete temp file
        reject(err.message);
      }
    });
  });
}

export function checkDir(dirPath) {
  const dirInfo = path.parse(dirPath);
  if (!fs.existsSync(dirInfo.dir)) {
    fs.mkdirSync(dirInfo.dir);
  }
}

export function exists(file) {
  return fs.existsSync(file);
}

export function getDownloadsDirectory(path) {
  const dir = `${LOCAL_DIR}downloads`;
  checkDir(dir);
  if (path) {
    return dir + `/${path}`;
  }
  return dir;
}

export function getFontDirectory(path) {
  const dir = `${LOCAL_DIR}fonts`;
  checkDir(dir);
  if (path) {
    return dir + `/${path}`;
  }
  return dir;
}

export function getAWSDirectory(path) {
  return `${AWS_URL}v3/${path}`;
}

export function getPathInfo(source) {
  return path.parse(source);
}

export function getFontDirectories(fontName) {
  return fs.readdirSync(getFontDirectory(), { withFileTypes: true })
    .filter(dirent => dirent && dirent.isDirectory())
    // .filter(dirent => typeof(fontName) !== undefined ? fontName === dirent.name : true)
    .map(dirent => dirent.name);
}

export function getFontFiles(fontName) {
  return fs.readdirSync(getFontDirectory(fontName), { withFileTypes: true })
    .filter(dirent => dirent && dirent.isFile() && dirent.name
      && (path.extname(dirent.name) === '.ttf' || path.extname(dirent.name) === '.otf'))
    .map(dirent => getFontDirectory(`${fontName}/${dirent.name}`));
}

export async function getFontZip(zipName) {
  const url = getAWSDirectory(zipName);
  const urlInfo = path.parse(url);
  if (await download(url, getDownloadsDirectory(urlInfo.base))) {
    fs.createReadStream(getDownloadsDirectory(urlInfo.base))
      .pipe(unzipper.Extract({ path: getFontDirectory() }));
  }
}

export async function getFontsFromGit(username, password) {
  const repo = 'github.com/ortype/ortype-font-files';
  const remote = `https://${username}:${password}@${repo}`;
  if (fs.existsSync(getFontDirectory('.git'))) {
    await git().silent(true).pull().cwd(getFontDirectory());
  } else {
    await git().silent(true).clone(remote, getFontDirectory());
  }
}

export async function getFontsFromGitWithSSH() {
  const GIT_SSH_COMMAND = "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null";
  if (fs.existsSync(getFontDirectory('.git'))) {
    await git().env({...process.env, GIT_SSH_COMMAND}).pull().cwd(getFontDirectory());
  } else {
    const repoPath = "git@github.com:ortype/ortype-font-files.git"; // must be SSH URL
    const result = await git().env({...process.env, GIT_SSH_COMMAND}).clone(repoPath, getFontDirectory())
    console.log("result: ", result);
  }
}
