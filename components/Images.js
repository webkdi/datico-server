const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const searchDir = "/var/www/dimitri.korenev/data/www/freud.online/";

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
        file.size > 30000
      ) {
        const filePath = path.join(dir, file.name);
        const fileSizeInBytes = file.size;
        const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
        const fileType = path.extname(file.name);


        console.log(filePath);


        const stats = fs.statSync(filePath);
        sharp(filePath).metadata((err, metadata) => {
          if (err) {
            console.log(err);
            return;
          }
          const width = metadata.width;
          const height = metadata.height;
          if (width > 30) {
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
  const fileList = searchForImageFiles(searchDir);
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);
  // console.log('List of found image files:', fileList);
  return fileList;
}

module.exports = {
  getListOfImages,
};
