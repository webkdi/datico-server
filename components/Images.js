const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");

const searchDir = "/var/www/dimitri.korenev/data/www/freud.online/";

async function searchForImageFiles(dir, visited, fileList) {
  if (!fileList) {
    fileList = [];
  }
  if (!visited) {
    visited = new Set();
  }
  visited.add(dir);
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory() && !file.name.includes("administrator")) {
      const subDir = path.join(dir, file.name);
      if (!visited.has(subDir)) {
        await searchForImageFiles(subDir, visited, fileList);
      }
    } else if (file.isFile() && (file.name.endsWith(".jpg") || file.name.endsWith(".png"))) {
      const filePath = path.join(dir, file.name);
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;
      const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
      if (fileSizeInKB > 30) {
        const image = await Jimp.read(filePath);
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        if (width > 30) {
          fileList.push({
            filePath,
            fileType: path.extname(file.name),
            fileSizeInKB,
            width,
            height
          });
        }
      }
    }
  }
  return fileList;
}

async function getListOfImages() {
  const fileList = await searchForImageFiles(searchDir);
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);
  return fileList;
}

module.exports = {
  getListOfImages,
};
