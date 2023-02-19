require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../routes/Database");
const sharp = require("sharp");

const baseDir = "/var/www/dimitri.korenev/data/www/freud.online/";
const searchDirs = ["media", "images"].map((dir) => path.join(baseDir, dir));

function searchForImageFiles(dir, visited, fileList) {
  try {
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
          const fileModifiedTime = stats.mtime.toISOString();
          const fileSizeInKB = Math.round(fileSizeInBytes / 1024);
          const fileType = path.extname(file.name).substring(1);
          if (fileSizeInKB > 20 && !filePath.includes("/administrator/")) {
            const hash = crypto
              .createHash("md5")
              .update(filePath)
              .digest("hex");
            fileList.push({
              filePath,
              fileName: file.name,
              fileType,
              fileSizeInKB,
              fileModifiedTime,
              hash,
            });
          }
        }
      }
    });
    return fileList;
  } catch (err) {
    console.error(err);
    return [];
  }
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
      .withMetadata({
        density: 72,
        densityUnit: "PixelsPerInch",
        Orientation: 1,
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true,
        quality: 100,
        colors: 64,
        dither: 0.5,
        trellisQuantisation: true,
        quantisationPosterize: 2,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .jpeg({ quality: 60 })
      .toBuffer((err, buffer, info) => {
        if (err) {
          reject(err);
          return;
        }

        if (info.format) {
          if (info.format === "png") {
            sharp(buffer)
              .resize(maxWidth * 0.7, maxHeight * 0.7, {
                fit: sharp.fit.inside,
              })
              .withMetadata({
                density: 72,
                densityUnit: "PixelsPerInch",
                Orientation: 1,
              })
              .png({
                compressionLevel: 9,
                adaptiveFiltering: true,
                force: true,
                quality: 100,
                colors: 64,
                dither: 0.5,
                trellisQuantisation: true,
                quantisationPosterize: 2,
                background: { r: 255, g: 255, b: 255, alpha: 0 },
              })
              .toFile(path, (err, info) => {
                if (err) {
                  reject(err);
                  return;
                }
                resolve(info);
              });
          } else if (info.format === "jpeg") {
            sharp(buffer)
              .resize(maxWidth, maxHeight, { fit: sharp.fit.inside })
              .withMetadata({
                density: 72,
                densityUnit: "PixelsPerInch",
                Orientation: 1,
              })
              .jpeg({ quality: 60 })
              .toFile(path, (err, info) => {
                if (err) {
                  reject(err);
                  return;
                }
                resolve(info);
              });
          }
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

async function dailyImageService() {
  // const imageList = await searchForImageFilesExecute();
  const imageList = [
    {
      "filePath": "/var/www/dimitri.korenev/data/www/freud.online/images/easyblog_articles/127/b2ap3_amp_handmade-791693_1920.jpg",
      "fileName": "b2ap3_amp_handmade-791693_1920.jpg",
      "fileType": "jpg",
      "fileSizeInKB": 57,
      "fileModifiedTime": "2023-02-17T15:26:23.526Z",
      "hash": "5837cd680ca642a441f1343b92f40964"
    },
    {
      "filePath": "/var/www/dimitri.korenev/data/www/freud.online/images/easyblog_articles/127/b2ap3_large_handmade-791693_1920.jpg",
      "fileName": "b2ap3_large_handmade-791693_1920.jpg",
      "fileType": "jpg",
      "fileSizeInKB": 63,
      "fileModifiedTime": "2023-02-19T15:34:56.886Z",
      "hash": "0d6fd5b5f482da62d0a9d9aff016f335"
    },
  ];

  if (imageList.length > 0) {

    var past = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 2 days in milliseconds
    const latestNewImages = imageList.filter((obj) => {
      const fileModifiedDate = new Date(obj.fileModifiedTime);
      console.log(past, fileModifiedDate);
      return fileModifiedDate > past && obj.fileSizeInKB > 1;
    });

    latestNewImages.forEach(async (image) => {
      const update = await optimizeImage(image.filePath, process.env.PRIVATE_APP_PASSWORD);
    })
    return `optimized ${latestNewImages.length} images`;

  } else {
    return "no new images";
  }
}

module.exports = {
  searchForImageFilesExecute,
  optimizeImage,
  getListOfImages,
  deleteFile,
  dailyImageService,
};
