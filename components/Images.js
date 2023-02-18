const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const baseDir = "/var/www/dimitri.korenev/data/www/freud.online/";
const searchDirs = ["media", "images"].map((dir) => path.join(baseDir, dir));

function searchForImageFiles(dir, visited, fileList) {
  if (!fileList) {
    fileList = [];
  }
  if (!visited) {
    visited = new Set();
  }
  visited.add(dir);
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((file) => {
    if (file.isDirectory()) {
      const subDir = path.join(dir, file.name);
      if (!visited.has(subDir) && searchDirs.some((searchDir) => subDir.startsWith(searchDir))) {
        searchForImageFiles(subDir, visited, fileList);
      }
    } else {
      if (file.name.endsWith(".jpg") || file.name.endsWith(".png")) {
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
        const fileType = path.extname(file.name);
        if (fileSizeInKB > 20 && !filePath.includes('/administrator/')) {
          const hash = crypto.createHash("md5").update(filePath).digest("hex");
          fileList.push({
            filePath,
            fileName: file.name,
            fileType,
            fileSizeInKB,
            hash,
          });
        }
      }
    }
  });
  return fileList;
}

function getListOfImages() {
  let fileList = [];
  searchDirs.forEach((dir) => {
    fileList = fileList.concat(searchForImageFiles(dir));
  });
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);
  return fileList;
}

module.exports = {
  getListOfImages,
};
