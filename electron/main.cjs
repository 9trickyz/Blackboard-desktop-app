const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isMinitab = false;
let savedBounds = null;
let isQuitting = false;
let initialFilePath = null;

function getFilePathFromArgs(argv) {
  if (!argv || !Array.isArray(argv)) return null;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (typeof arg === 'string' && !arg.startsWith('--')) {
      if (arg === '.' || arg.toLowerCase().endsWith('main.cjs') || arg.toLowerCase().endsWith('electron.exe')) {
        continue;
      }
      const lower = arg.toLowerCase();
      if ((lower.endsWith('.blackboard') || lower.endsWith('.json')) && fs.existsSync(arg)) {
        return path.resolve(arg);
      }
    }
  }
  return null;
}

function sendFileToRenderer(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('file-opened', {
        filePath,
        fileName,
        content
      });
    }
  } catch (err) {
    console.error('Failed to read file:', err);
  }
}

// Single Instance Lock for Windows file association opening
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  initialFilePath = getFilePathFromArgs(process.argv);

  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const filePath = getFilePathFromArgs(commandLine);
      if (filePath) {
        sendFileToRenderer(filePath);
      }
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow && mainWindow.webContents) {
      sendFileToRenderer(filePath);
    } else {
      initialFilePath = filePath;
    }
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1320,
      height: 840,
      minWidth: 420,
      minHeight: 300,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false
      }
    });

    const devUrl = 'http://localhost:5173';
    const prodPath = path.join(__dirname, '../dist/index.html');

    if (app.isPackaged) {
      mainWindow.loadFile(prodPath);
    } else if (process.env.VITE_DEV === 'true') {
      mainWindow.loadURL(devUrl).catch(() => {
        mainWindow.loadFile(prodPath);
      });
    } else {
      mainWindow.loadFile(prodPath);
    }

    mainWindow.webContents.once('did-finish-load', () => {
      if (initialFilePath) {
        setTimeout(() => {
          sendFileToRenderer(initialFilePath);
        }, 400);
      }
    });

    mainWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('app-close-requested');
        }
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// IPC Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-minitab', () => {
  if (!mainWindow) return;
  if (!isMinitab) {
    savedBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      width: 440,
      height: 300,
      x: savedBounds.x + (savedBounds.width - 440),
      y: savedBounds.y
    });
    isMinitab = true;
    mainWindow.setAlwaysOnTop(true);
  } else {
    if (savedBounds) {
      mainWindow.setBounds(savedBounds);
    } else {
      mainWindow.setSize(1320, 840);
      mainWindow.center();
    }
    isMinitab = false;
    mainWindow.setAlwaysOnTop(false);
  }
  mainWindow.webContents.send('minitab-state-changed', isMinitab);
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('window-close-confirmed', () => {
  isQuitting = true;
  if (mainWindow) {
    mainWindow.close();
  }
  app.quit();
});

ipcMain.on('window-always-on-top', (_event, flag) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(Boolean(flag));
  }
});

ipcMain.handle('get-initial-file', () => {
  if (initialFilePath && fs.existsSync(initialFilePath)) {
    try {
      const content = fs.readFileSync(initialFilePath, 'utf8');
      const fileName = path.basename(initialFilePath);
      return { filePath: initialFilePath, fileName, content };
    } catch (err) {
      console.error('Failed to read initial file:', err);
      return null;
    }
  }
  return null;
});

ipcMain.handle('save-file-dialog', async (_event, data) => {
  if (!mainWindow) return { success: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export / Save Blackboard',
    defaultPath: data.suggestedName || 'blackboard-board.blackboard',
    filters: data.filters || [
      { name: 'Blackboard Document', extensions: ['blackboard', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, data.content, 'utf8');
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('open-file-dialog', async () => {
  if (!mainWindow) return { success: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Blackboard Document',
    filters: [
      { name: 'Blackboard Files', extensions: ['blackboard', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!canceled && filePaths && filePaths.length > 0) {
    try {
      const content = fs.readFileSync(filePaths[0], 'utf8');
      return { success: true, content, filePath: filePaths[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});
