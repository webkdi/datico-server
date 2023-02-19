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

async function searchForImageFilesExecute() {
  let fileList = [];
  searchDirs.forEach((dir) => {
    fileList = fileList.concat(searchForImageFiles(dir));
  });
  const json = JSON.stringify(fileList, null, 2);
  fs.writeFileSync("image_files.json", json);

  const truncate = await db.truncateImageData();
  fileList.forEach((file) => {
    db.storeImageData(file);
  });
  return fileList;
}

function optimizeImage(path, password) {
  return new Promise((resolve, reject) => {
    if (!password) {
      reject("password is required!");
      return;
    } else if (password !== process.env.PRIVATE_APP_PASSWORD) {
      reject("password is wrong!");
      return;
    }

    const maxWidth = 1200;
    const maxHeight = 700;

    sharp(path)
      .resize(maxWidth, maxHeight, { fit: sharp.fit.inside })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true,
        quality: 100,
        colors: 64,
        dither: 0.5, // set dither to a value between 0.0 and 1.0
        trellisQuantisation: true,
        quantisationPosterize: 2,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .jpeg({ quality: 60 })
      .toBuffer((err, buffer, info) => {
        if (err) {
          reject(err);
          return;
        }

        if (info.format) {
          sharp(buffer).toFile(path, (err, info) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(info);
          });
        } else {
          reject(`Invalid input: ${path} is not a valid image file`);
        }
      });
  });
}

function deleteFile(filePath, password) {
  return new Promise((resolve, reject) => {
    if (!password) {
      return reject("Password is required!");
    } else if (password !== process.env.PRIVATE_APP_PASSWORD) {
      return reject("Wrong password!");
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${err}`);
        return reject(`Error deleting file: ${err}`);
      } else {
        console.log(`File deleted: ${filePath}`);
        return resolve();
      }
    });
  });
}

async function getListOfImages() {
  const images = await db.getImagesList();

  images.forEach((obj) => {
    const url = obj.path.replace(
      "/var/www/dimitri.korenev/data/www/",
      "https://"
    );
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
