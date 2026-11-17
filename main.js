const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow(splashWindow = null) {
  const mainWindow = new BrowserWindow({
    title: 'Sentinel',
    fullscreen: true,
    show: false,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html')).then(() => {
    if (mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.show();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
  }).catch((error) => {
    console.error('Failed to load Sentinel.', error);
    app.quit();
  });
}

function createSplashWindow() {
  const splashWindow = new BrowserWindow({
    title: 'Sentinel',
    width: 578,
    height: 400,
    center: true,
    frame: false,
    show: false,
    backgroundColor: '#020607',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html')).then(() => {
    if (splashWindow.isDestroyed()) {
      return;
    }

    splashWindow.show();
    createWindow(splashWindow);
  }).catch((error) => {
    console.error('Failed to load the Sentinel splash screen.', error);
    if (!splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    createWindow();
  });
}

app.whenReady().then(() => {
  createSplashWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
