const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

app.commandLine.appendSwitch("force-device-scale-factor", "1");

function encodeBitmap(image) {
  const { width, height } = image.getSize();
  const pixels = image.toBitmap();
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const bitmap = Buffer.alloc(54 + pixelDataSize);

  if (pixels.length !== width * height * 4) {
    throw new Error("Splash screenshot returned an unexpected pixel buffer size.");
  }

  bitmap.write("BM", 0, 2, "ascii");
  bitmap.writeUInt32LE(bitmap.length, 2);
  bitmap.writeUInt32LE(54, 10);
  bitmap.writeUInt32LE(40, 14);
  bitmap.writeInt32LE(width, 18);
  bitmap.writeInt32LE(height, 22);
  bitmap.writeUInt16LE(1, 26);
  bitmap.writeUInt16LE(24, 28);
  bitmap.writeUInt32LE(pixelDataSize, 34);
  bitmap.writeInt32LE(3780, 38);
  bitmap.writeInt32LE(3780, 42);

  for (let y = 0; y < height; y += 1) {
    const sourceRow = y * width * 4;
    const destinationRow = 54 + (height - 1 - y) * rowSize;

    for (let x = 0; x < width; x += 1) {
      const sourcePixel = sourceRow + x * 4;
      const destinationPixel = destinationRow + x * 3;
      bitmap[destinationPixel] = pixels[sourcePixel];
      bitmap[destinationPixel + 1] = pixels[sourcePixel + 1];
      bitmap[destinationPixel + 2] = pixels[sourcePixel + 2];
    }
  }

  return bitmap;
}

app.whenReady().then(async () => {
  let splashWindow;

  try {
    const width = 578;
    const height = 400;
    splashWindow = new BrowserWindow({
      width,
      height,
      useContentSize: true,
      show: false,
      frame: false,
      backgroundColor: "#020607",
      webPreferences: {
        offscreen: true,
        backgroundThrottling: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    await splashWindow.loadFile(path.join(__dirname, "splash.html"));
    await splashWindow.webContents.executeJavaScript(
      "document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))"
    );

    const image = await splashWindow.webContents.capturePage();
    const bitmap = encodeBitmap(image);
    fs.writeFileSync(path.join(__dirname, "portable-splash.bmp"), bitmap);
    console.log(`Generated portable splash at ${width}x${height}.`);
  } catch (error) {
    console.error("Failed to generate the portable splash bitmap.", error);
    process.exitCode = 1;
  } finally {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }
    app.quit();
  }
});
