let uploadedImage = null;
let currentImageData = null;
let initialImageData = null; // Store the initial image data

// Function to handle image upload
document.getElementById('imageUpload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    const canvas = document.getElementById('designCanvas');
    const ctx = canvas.getContext('2d');

    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            uploadedImage = img; // Store the uploaded image
            initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Store the initial image data
            currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Initialize current image data with the initial image
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// Example thread colors (in RGB)
const threadColors = [
    { name: 'Red', rgb: [255, 0, 0] },
    { name: 'Green', rgb: [0, 255, 0] },
    { name: 'Blue', rgb: [0, 0, 255] },
    { name: 'Black', rgb: [0, 0, 0] },
    { name: 'White', rgb: [255, 255, 255] },
    { name: 'Yellow', rgb: [255, 255, 0] },
    { name: 'Magenta', rgb: [255, 0, 255] },
    { name: 'Cyan', rgb: [0, 255, 255] }
    // Add more colors as needed
];

function findNearestThreadColor(r, g, b) {
    let nearestColor = threadColors[0];
    let minDistance = Infinity;

    threadColors.forEach(color => {
        const [tr, tg, tb] = color.rgb;
        const distance = Math.sqrt(
            (r - tr) ** 2 +
            (g - tg) ** 2 +
            (b - tb) ** 2
        );
        if (distance < minDistance) {
            minDistance = distance;
            nearestColor = color;
        }
    });

    return nearestColor;
}

function mapToThreadColors(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const nearestColor = findNearestThreadColor(r, g, b);
        [data[i], data[i + 1], data[i + 2]] = nearestColor.rgb;
    }
    return imageData;
}

function adjustBrightness(imageData, brightnessValue) {
    const data = imageData.data;
    const adjustment = brightnessValue / 100;

    for (let i = 0; i < data.length; i += 4) {
        data[i] += 255 * adjustment;  // red
        data[i + 1] += 255 * adjustment; // green
        data[i + 2] += 255 * adjustment; // blue
    }
    return imageData;
}

function applyGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;       // red
        data[i + 1] = avg;   // green
        data[i + 2] = avg;   // blue
    }
    return imageData;
}

function applyVectorizeEffect(imageData, width, height) {
    // Apply edge detection to enhance the vector effect
    return applyEdgeDetection(imageData, width, height);
}

function applyEdgeDetection(imageData, width, height) {
    const data = imageData.data;
    const edgeData = new Uint8ClampedArray(data.length);
    const grayscaleData = new Uint8ClampedArray(data.length);

    // Convert to grayscale first for edge detection
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = avg;
        grayscaleData[i + 3] = 255; // Fully opaque
    }

    const sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
    ];

    const sobelY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelIndex = (y * width + x) * 4;
            let gX = 0, gY = 0;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const weightX = sobelX[i + 1][j + 1];
                    const weightY = sobelY[i + 1][j + 1];
                    const neighborIndex = ((y + i) * width + (x + j)) * 4;
                    gX += grayscaleData[neighborIndex] * weightX;
                    gY += grayscaleData[neighborIndex] * weightY;
                }
            }

            const magnitude = Math.sqrt(gX * gX + gY * gY);
            edgeData[pixelIndex] = edgeData[pixelIndex + 1] = edgeData[pixelIndex + 2] = magnitude > 50 ? 0 : 255;
            edgeData[pixelIndex + 3] = 255; // Alpha
        }
    }

    // Combine edges with original color data
    for (let i = 0; i < data.length; i += 4) {
        if (edgeData[i] === 0) {
            data[i] = edgeData[i]; // Red
            data[i + 1] = edgeData[i + 1]; // Green
            data[i + 2] = edgeData[i + 2]; // Blue
        }
    }

    return imageData;
}

document.getElementById('adjustPatterns').addEventListener('click', function () {
    const filterType = document.getElementById('filters').value;
    const canvas = document.getElementById('designCanvas');
    const ctx = canvas.getContext('2d');

    if (uploadedImage && initialImageData) {
        if (filterType === 'none') {
            ctx.putImageData(initialImageData, 0, 0); // Reset to initial image
            currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Update current image data to initial image
        } else {
            ctx.putImageData(currentImageData, 0, 0); // Use the current image data

            switch (filterType) {
                case 'grayscale':
                    currentImageData = applyGrayscale(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    break;
                case 'brightness':
                    const brightnessValue = document.getElementById('brightness').value;
                    currentImageData = adjustBrightness(ctx.getImageData(0, 0, canvas.width, canvas.height), brightnessValue);
                    break;
                case 'threadMapping':
                    currentImageData = mapToThreadColors(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    break;
                case 'vectorize':
                    currentImageData = applyVectorizeEffect(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
                    break;
                default:
                    break;
            }
            ctx.putImageData(currentImageData, 0, 0); // Update the canvas with the new image data
        }
        // Generate color information list after adjusting patterns
        const colorsList = generateColorsList(ctx, canvas.width, canvas.height);
        displayColorInfo(colorsList); // Display color information
    }
});

function generateColorsList(ctx, width, height) {
    const imageData = currentImageData;
    const data = imageData.data;
    const colorCounts = {};

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const colorKey = `${r},${g},${b}`;

        if (!colorCounts[colorKey]) {
            colorCounts[colorKey] = 0;
        }
        colorCounts[colorKey]++;
    }

    const colorList = [];
    for (const [color, count] of Object.entries(colorCounts)) {
        const [r, g, b] = color.split(',').map(Number);
        const nearestColor = findNearestThreadColor(r, g, b);
        colorList.push({ color: nearestColor.name, count });
    }

    return colorList;
}

function displayColorInfo(colorsList) {
    const colorInfoList = document.getElementById('colorInfoList');
    colorInfoList.innerHTML = ''; // Clear previous data

    colorsList.forEach(item => {
        const colorInfo = document.createElement('div');
        colorInfo.className = 'color-info-item';
        colorInfo.innerText = `Color: ${item.color}, Count: ${item.count}`;
        colorInfoList.appendChild(colorInfo);
    });
}

document.getElementById('visualizeDesign').addEventListener('click', function () {
    if (uploadedImage && currentImageData) {
        const canvas = document.getElementById('designCanvas');
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the existing canvas
        ctx.putImageData(currentImageData, 0, 0); // Redraw the current image data

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 0.5;

        for (let i = 0; i < canvas.width; i += 10) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
        }
        for (let j = 0; j < canvas.height; j += 10) {
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j);
        }
        ctx.stroke();

        const threadUsage = calculateThreadUsage(ctx, canvas.width, canvas.height);
        alert(threadUsage);
    }
});

function calculateThreadUsage(ctx, width, height) {
    const imageData = currentImageData; // Use the current image data
    const data = imageData.data;
    const colorCounts = {};

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const colorKey = `${r},${g},${b}`;

        if (!colorCounts[colorKey]) {
            colorCounts[colorKey] = 0;
        }
        colorCounts[colorKey]++;
    }

    let threadEstimate = "";
    const pixelsPerInch = 96; // Assuming 96 PPI for screen pixels
    const inchesPerPixel = 1 / pixelsPerInch;
    const threadsPerInch = 18; // Assuming 18 threads per inch in both directions (i.e., 324 stitches per sq inch)

    for (const [color, count] of Object.entries(colorCounts)) {
        const stitches = count / (pixelsPerInch * pixelsPerInch);
        const threadLength = stitches / threadsPerInch; // Estimate length of thread

        threadEstimate += `${color}: approximately ${threadLength.toFixed(2)} yards of thread\n`;
    }

    return threadEstimate;
}

document.getElementById('downloadDesign').addEventListener('click', function () {
    const canvas = document.getElementById('designCanvas');
    const link = document.createElement('a');
    link.download = 'embroidery-design.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

document.getElementById('filters').addEventListener('change', function () {
    const filterType = document.getElementById('filters').value;
    const brightnessControl = document.getElementById('brightness-control');
    if (filterType === 'brightness') {
        brightnessControl.style.display = 'block';
    } else {
        brightnessControl.style.display = 'none';
    }
});


// // JSON file is needed! 

// let uploadedImage = null;
// let currentImageData = null;
// let initialImageData = null; // Store the initial image data
// let threadColors = []; // Will hold the colors loaded from JSON

// // Load thread colors from JSON when the page loads
// window.onload = function() {
//     loadThreadColors().then(() => {
//         console.log('Thread colors loaded:', threadColors);
//     }).catch(error => {
//         console.error('Error loading thread colors:', error);
//     });
// };

// // Function to load thread colors from JSON
// function loadThreadColors() {
//     return fetch('path/to/threadColors.json')
//         .then(response => response.json())
//         .then(data => {
//             threadColors = data;
//         });
// }

// // Function to handle image upload
// document.getElementById('imageUpload').addEventListener('change', function (event) {
//     const file = event.target.files[0];
//     const reader = new FileReader();
//     const canvas = document.getElementById('designCanvas');
//     const ctx = canvas.getContext('2d');

//     reader.onload = function (e) {
//         const img = new Image();
//         img.onload = function () {
//             canvas.width = img.width;
//             canvas.height = img.height;
//             ctx.drawImage(img, 0, 0);
//             uploadedImage = img; // Store the uploaded image
//             initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Store the initial image data
//             currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Initialize current image data with the initial image
//         };
//         img.src = e.target.result;
//     };
//     reader.readAsDataURL(file);
// });

// function findNearestThreadColor(r, g, b) {
//     let nearestColor = threadColors[0];
//     let minDistance = Infinity;

//     threadColors.forEach(color => {
//         const [tr, tg, tb] = color.rgb;
//         const distance = Math.sqrt(
//             (r - tr) ** 2 +
//             (g - tg) ** 2 +
//             (b - tb) ** 2
//         );
//         if (distance < minDistance) {
//             minDistance = distance;
//             nearestColor = color;
//         }
//     });

//     return nearestColor;
// }

// function mapToThreadColors(imageData) {
//     const data = imageData.data;
//     for (let i = 0; i < data.length; i += 4) {
//         const r = data[i];
//         const g = data[i + 1];
//         const b = data[i + 2];
//         const nearestColor = findNearestThreadColor(r, g, b);
//         [data[i], data[i + 1], data[i + 2]] = nearestColor.rgb;
//     }
//     return imageData;
// }

// function adjustBrightness(imageData, brightnessValue) {
//     const data = imageData.data;
//     const adjustment = brightnessValue / 100;

//     for (let i = 0; i < data.length; i += 4) {
//         data[i] += 255 * adjustment;  // red
//         data[i + 1] += 255 * adjustment; // green
//         data[i + 2] += 255 * adjustment; // blue
//     }
//     return imageData;
// }

// function applyGrayscale(imageData) {
//     const data = imageData.data;
//     for (let i = 0; i < data.length; i += 4) {
//         const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
//         data[i] = avg;       // red
//         data[i + 1] = avg;   // green
//         data[i + 2] = avg;   // blue
//     }
//     return imageData;
// }

// function applyVectorizeEffect(imageData, width, height) {
//     // Apply edge detection to enhance the vector effect
//     return applyEdgeDetection(imageData, width, height);
// }

// function applyEdgeDetection(imageData, width, height) {
//     const data = imageData.data;
//     const edgeData = new Uint8ClampedArray(data.length);
//     const grayscaleData = new Uint8ClampedArray(data.length);

//     // Convert to grayscale first for edge detection
//     for (let i = 0; i < data.length; i += 4) {
//         const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
//         grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = avg;
//         grayscaleData[i + 3] = 255; // Fully opaque
//     }

//     const sobelX = [
//         [-1, 0, 1],
//         [-2, 0, 2],
//         [-1, 0, 1]
//     ];

//     const sobelY = [
//         [-1, -2, -1],
//         [0, 0, 0],
//         [1, 2, 1]
//     ];

//     for (let y = 1; y < height - 1; y++) {
//         for (let x = 1; x < width - 1; x++) {
//             let pixelIndex = (y * width + x) * 4;
//             let gX = 0, gY = 0;

//             for (let i = -1; i <= 1; i++) {
//                 for (let j = -1; j <= 1; j++) {
//                     const weightX = sobelX[i + 1][j + 1];
//                     const weightY = sobelY[i + 1][j + 1];
//                     const neighborIndex = ((y + i) * width + (x + j)) * 4;
//                     gX += grayscaleData[neighborIndex] * weightX;
//                     gY += grayscaleData[neighborIndex] * weightY;
//                 }
//             }

//             const magnitude = Math.sqrt(gX * gX + gY * gY);
//             edgeData[pixelIndex] = edgeData[pixelIndex + 1] = edgeData[pixelIndex + 2] = magnitude > 50 ? 0 : 255;
//             edgeData[pixelIndex + 3] = 255; // Alpha
//         }
//     }

//     // Combine edges with original color data
//     for (let i = 0; i < data.length; i += 4) {
//         if (edgeData[i] === 0) {
//             data[i] = edgeData[i]; // Red
//             data[i + 1] = edgeData[i + 1]; // Green
//             data[i + 2] = edgeData[i + 2]; // Blue
//         }
//     }

//     return imageData;
// }

// document.getElementById('adjustPatterns').addEventListener('click', function () {
//     const filterType = document.getElementById('filters').value;
//     const canvas = document.getElementById('designCanvas');
//     const ctx = canvas.getContext('2d');

//     if (uploadedImage && initialImageData) {
//         if (filterType === 'none') {
//             ctx.putImageData(initialImageData, 0, 0); // Reset to initial image
//             currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Update current image data to initial image
//         } else {
//             ctx.putImageData(currentImageData, 0, 0); // Use the current image data

//             switch (filterType) {
//                 case 'grayscale':
//                     currentImageData = applyGrayscale(ctx.getImageData(0, 0, canvas.width, canvas.height));
//                     break;
//                 case 'brightness':
//                     const brightnessValue = document.getElementById('brightness').value;
//                     currentImageData = adjustBrightness(ctx.getImageData(0, 0, canvas.width, canvas.height), brightnessValue);
//                     break;
//                 case 'threadMapping':
//                     currentImageData = mapToThreadColors(ctx.getImageData(0, 0, canvas.width, canvas.height));
//                     break;
//                 case 'vectorize':
//                     currentImageData = applyVectorizeEffect(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
//                     break;
//                 default:
//                     break;
//             }
//             ctx.putImageData(currentImageData, 0, 0); // Update the canvas with the new image data
//         }
//         // Generate color information list after adjusting patterns
//         const colorsList = generateColorsList(ctx, canvas.width, canvas.height);
//         displayColorInfo(colorsList); // Display color information
//     }
// });

// function generateColorsList(ctx, width, height) {
//     const imageData = currentImageData;
//     const data = imageData.data;
//     const colorCounts = {};

//     for (let i = 0; i < data.length; i += 4) {
//         const r = data[i];
//         const g = data[i + 1];
//         const b = data[i + 2];
//         const colorKey = `${r},${g},${b}`;

//         if (!colorCounts[colorKey]) {
//             colorCounts[colorKey] = 0;
//         }
//         colorCounts[colorKey]++;
//     }

//     const colorList = [];
//     for (const [color, count] of Object.entries(colorCounts)) {
//         const [r, g, b] = color.split(',').map(Number);
//         const nearestColor = findNearestThreadColor(r, g, b);
//         colorList.push({ color: nearestColor.name, count });
//     }

//     return colorList;
// }

// function displayColorInfo(colorsList) {
//     const colorInfoList = document.getElementById('colorInfoList');
//     colorInfoList.innerHTML = ''; // Clear previous data

//     colorsList.forEach(item => {
//         const colorInfo = document.createElement('div');
//         colorInfo.className = 'color-info-item';
//         colorInfo.innerText = `Color: ${item.color}, Count: ${item.count}`;
//         colorInfoList.appendChild(colorInfo);
//     });
// }

// document.getElementById('visualizeDesign').addEventListener('click', function () {
//     if (uploadedImage && currentImageData) {
//         const canvas = document.getElementById('designCanvas');
//         const ctx = canvas.getContext('2d');

//         ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the existing canvas
//         ctx.putImageData(currentImageData, 0, 0); // Redraw the current image data

//         ctx.strokeStyle = 'red';
//         ctx.lineWidth = 0.5;

//         for (let i = 0; i < canvas.width; i += 10) {
//             ctx.moveTo(i, 0);
//             ctx.lineTo(i, canvas.height);
//         }
//         for (let j = 0; j < canvas.height; j += 10) {
//             ctx.moveTo(0, j);
//             ctx.lineTo(canvas.width, j);
//         }
//         ctx.stroke();

//         const threadUsage = calculateThreadUsage(ctx, canvas.width, canvas.height);
//         alert(threadUsage);
//     }
// });

// function calculateThreadUsage(ctx, width, height) {
//     const imageData = currentImageData; // Use the current image data
//     const data = imageData.data;
//     const colorCounts = {};

//     for (let i = 0; i < data.length; i += 4) {
//         const r = data[i];
//         const g = data[i + 1];
//         const b = data[i + 2];
//         const colorKey = `${r},${g},${b}`;

//         if (!colorCounts[colorKey]) {
//             colorCounts[colorKey] = 0;
//         }
//         colorCounts[colorKey]++;
//     }

//     let threadEstimate = "";
//     const pixelsPerInch = 96; // Assuming 96 PPI for screen pixels
//     const cmPerInch = 2.54; // Conversion factor from inches to centimeters
//     const threadsPerInch = 18; // Assuming 18 threads per inch in both directions

//     for (const [color, count] of Object.entries(colorCounts)) {
//         const stitches = count / (pixelsPerInch * pixelsPerInch);
//         const threadLengthCm = (stitches / threadsPerInch) * cmPerInch; // Convert to centimeters

//         threadEstimate += `${color}: approximately ${threadLengthCm.toFixed(2)} cm of thread\n`;
//     }

//     return threadEstimate;
// }

// document.getElementById('downloadDesign').addEventListener('click', function () {
//     const canvas = document.getElementById('designCanvas');
//     const link = document.createElement('a');
//     link.download = 'embroidery-design.png';
//     link.href = canvas.toDataURL('image/png');
//     link.click();
// });

// document.getElementById('filters').addEventListener('change', function () {
//     const filterType = document.getElementById('filters').value;
//     const brightnessControl = document.getElementById('brightness-control');
//     if (filterType === 'brightness') {
//         brightnessControl.style.display = 'block';
//     } else {
//         brightnessControl.style.display = 'none';
//     }
// });