const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const mediaDir = "/var/www/dimitri.korenev/data/www/freud.online/media/";
const imagesDir = "/var/www/dimitri.korenev/data/www/freud.online/images/";

function searchForImageFiles(dir, fileList) {
  if (!fileList) {
    fileList = [];
  }
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach((file) => {
      if (file.isDirectory() && !file.name.includes("administrator")) {
        const subDir = path.join(dir, file.name);
        searchForImageFiles(subDir, fileList);
      } else if (
        (file.name.endsWith(".jpg") || file.name.endsWith(".png")) &&
        (dir === mediaDir || dir === imagesDir) // check if the directory matches mediaDir or imagesDir
      ) {
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
        const fileType = path.extname(file.name);

        sharp(filePath).metadata((err, metadata) => {
          if (err) {
            console.log(err);
            return;
          }
          const width = metadata.width;
          const height = metadata.height;
          if (fileSizeInKB > 30 && width > 30) {
            fileList.push({
              filePath,
              fileType,
              fileSizeInKB,
              width,
              height,
            });
          }
        });
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  return fileList;
}

function getListOfImages() {
  const fileList = searchForImageFiles(mediaDir);
  fileList.push(...searchForImageFiles(imagesDir));
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);
  return fileList;
}

module.exports = {
  getListOfImages,
};