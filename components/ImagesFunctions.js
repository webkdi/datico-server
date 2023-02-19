require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../routes/Database");
const sharp = require("sharp");

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
      if (
        !visited.has(subDir) &&
        searchDirs.some((searchDir) => subDir.startsWith(searchDir))
      ) {
        searchForImageFiles(subDir, visited, fileList);
      }
    } else {
      if (file.name.endsWith(".jpg") || file.name.endsWith(".png")) {
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
        const fileType = path.extname(file.name);
        if (fileSizeInKB > 20 && !filePath.includes("/administrator/")) {
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

function searchForImageFilesExecute() {
  let fileList = [];
  searchDirs.forEach((dir) => {
    fileList = fileList.concat(searchForImageFiles(dir));
  });
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);
  fileList.forEach((file) => {
    db.storeImageData(file);
  });
  return fileList;
}

function optimizeImage(path, password) {

  if (!password) {
    return "password is required!";
  } else if (password !== process.env.PRIVATE_APP_PASSWORD) {
    return ("password is wrong!");
  }

  // Define the path to the image file
  const imagePath = path;

  // Set the new width and height for the image
  const maxWidth = 1200;
  const maxHeight = 800;
  const quality = 60;
  compressionLevel = 8;

  // Use the sharp library to resize the image
  sharp(imagePath)
    .resize(maxWidth, maxHeight, { fit: sharp.fit.inside })
    .png({ compressionLevel: compressionLevel }) // Add PNG compression
    .jpeg({ quality: quality }) // or webp({ quality: quality }) for WebP format
    .toBuffer((err, buffer, info) => {
      if (err) {
        console.error(err);
      } else if (info.format) {
        sharp(buffer).toFile(imagePath, (err, info) => {
          if (err) {
            console.error(err);
          } else {
            console.log(info);
            return info;
          }
        });
      } else {
        console.error(`Invalid input: ${imagePath} is not a valid image file`);
      }
    });
}

function deleteFile(filePath, password) {

  if (!password) {
    return "password is required!";
  } else if (password !== process.env.PRIVATE_APP_PASSWORD) {
    return ("password is wrong!");
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${err}`);
      return;
    }
    console.log(`File deleted: ${filePath}`);
    return 
  });
}

async function getListOfImages(path) {
  const images = await db.getImagesList();

  images.forEach((obj) => {
    const url = obj.path.replace('/var/www/dimitri.korenev/data/www/', 'https://');
    obj.url = url;
    delete obj.name;
  });
  
  return images;

}

module.exports = {
  searchForImageFilesExecute,
  optimizeImage,
  getListOfImages,
  deleteFile,
};