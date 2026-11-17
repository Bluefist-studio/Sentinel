const path = require("node:path");
const { app, BrowserWindow } = require("electron");

app.whenReady().then(() => {
  const previewWindow = new BrowserWindow({
    title: "Sentinel Splash Preview",
    width: 578,
    height: 400,
    center: true,
    show: false,
    backgroundColor: "#020607",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  previewWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    if (input.key === "F5") {
      event.preventDefault();
      previewWindow.webContents.reload();
    } else if (input.key === "Escape") {
      app.quit();
    }
  });

  previewWindow.loadFile(path.join(__dirname, "splash.html")).then(() => {
    if (!previewWindow.isDestroyed()) {
      previewWindow.show();
    }
  }).catch((error) => {
    console.error("Failed to load the splash preview.", error);
    app.quit();
  });
});
