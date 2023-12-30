const sharp = require('sharp');
const axios = require('axios');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Function to fetch an image from a URL and return as a buffer
async function fetchImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
}

// Function to process an image (resizing)
async function processImage(imageBuffer, width, height) {
    return sharp(imageBuffer)
        .resize(width, height)
        .webp({ quality: 80 }) // Convert to WebP with the specified quality
        .toBuffer();
}

// Function to save the image buffer to a file
async function saveImage(buffer, filename) {
    const dirPath = path.join(__dirname, '..', 'images');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, filename + '.webp');
    await fs.promises.writeFile(filePath, buffer);
    // console.log(`Image saved at ${filePath}`);
    return filePath;
}

async function createCollage(urls) {
    try {
        // console.log("Starting collage creation with URLs:", urls);

        const keyWidth = 300;
        const keyHight = 200;


        if (urls.length == 0) { console.log("no images"); return null; }

        let images = await Promise.all(urls.map(async (url, index) => {
            const buffer = await fetchImage(url);
            const processedImage = await processImage(buffer, keyWidth, keyHight); // Resize to 300x300

            // await saveImage(processedImage, `image_${index}`);

            return processedImage;
        }));

        // Determine the number of images to use
        let numImages = images.length;

        // Set the canvas size and image positions based on the number of images
        let collageWidth, collageHeight;
        let compositeOperations = [];
        let left = 0, top = 0;

        if (numImages === 1) {
            collageWidth = keyWidth;
            collageHeight = keyHight;
        } else if (numImages === 2) {
            collageWidth = keyWidth * 2;
            collageHeight = keyHight;
        } else if (numImages === 3) {
            collageWidth = keyWidth * 2;
            collageHeight = keyHight;
            images = images.slice(0, 2); // Use only the first 2 images
        } else if (numImages >= 4) {
            collageWidth = keyWidth * 2;
            collageHeight = keyHight * 2;
            images = images.slice(0, 4); // Use only the first 4 images
            numImages = 4; // Adjust the number of images to 4
        } else {
            return null;
        }

        let collageInstance = sharp({
            create: {
                width: collageWidth,
                height: collageHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            }
        });


        for (let index = 0; index < numImages; index++) {
            const img = images[index];
            compositeOperations.push({ input: img, left: left, top: top });

            if (numImages === 2 || (numImages > 2 && (index + 1) % 2 === 0)) {
                left = 0; // Reset left for next row
                top += keyHight; // Move down for next row
            } else {
                left += keyWidth; // Move right for next image
            }
        }

        // Apply all composites at once
        collageInstance = collageInstance.composite(compositeOperations);

        // Final processing
        collageInstance = collageInstance.webp({ quality: 80 });
        buffer = await collageInstance.toBuffer();

        // Create a new Sharp instance with the buffer and check its dimensions
        const resizedInstance = sharp(buffer);
        const metadata = await resizedInstance.metadata();

        // If the width is less than 600, resize the image to have a width of 600, maintaining aspect ratio
        if (metadata.width < 600) {
            buffer = await resizedInstance.resize(600, null).toBuffer();
        }

        // await saveImage(buffer, 'collage');
        console.log('Collage created successfully.');

        return buffer;
    } catch (error) {
        console.error('Error creating the collage:', error.message);
        return null;
    }
}


// Exporting the functions
module.exports = {
    createCollage
};