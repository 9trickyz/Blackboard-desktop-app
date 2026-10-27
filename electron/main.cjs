const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');



let mainWindow = null;
let isMinitab = false;
let savedBounds = null;
let isQuitting = false;

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

  mainWindow.on('close', (e) => {
    fs.appendFileSync('main_debug.log', `[${new Date().toISOString()}] mainWindow on close, isQuitting=${isQuitting}\n`);
    if (!isQuitting) {
      e.preventDefault();
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-close-requested');
      }
    }
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    fs.appendFileSync('main_debug.log', `[${new Date().toISOString()}] render-process-gone: ${JSON.stringify(details)}\n`);
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    fs.appendFileSync('main_debug.log', `[${new Date().toISOString()}] did-fail-load: ${code} ${desc}\n`);
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
  fs.appendFileSync('main_debug.log', `[${new Date().toISOString()}] window-all-closed fired\n`);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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
  fs.appendFileSync('main_debug.log', `[${new Date().toISOString()}] ipcMain window-close received\n`);
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('window-close-confirmed', () => {
  fs.appendFileSync('main_debug.log', `[${new Date().toISOString()}] ipcMain window-close-confirmed received\n`);
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
