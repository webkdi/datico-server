const fs = require("fs");
const path = require("path");

const searchDir = "/var/www/dimitri.korenev/data/www/freud.online/";

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
      if (!visited.has(subDir)) {
        searchForImageFiles(subDir, visited, fileList);
      }
    } else {
      if (file.name.endsWith(".jpg") || file.name.endsWith(".png")) {
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
        const fileType = path.extname(file.name);
        if (fileSizeInKB > 10) {
          fileList.push({
            filePath,
            fileType,
            fileSizeInKB,
          });
        }
      }
    }
  });
  return fileList;
}

function getListOfImages() {
  const fileList = searchForImageFiles(searchDir);
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);
  // console.log('List of found image files:', fileList);
  return fileList;
}

module.exports = {
  getListOfImages,
};
