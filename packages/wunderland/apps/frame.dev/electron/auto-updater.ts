/**
 * Auto-Updater - Handles application updates via electron-updater
 */

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

export function setupAutoUpdater(mainWindow: BrowserWindow | null): void {
  // Configure logging
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    sendStatusToWindow(mainWindow, 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    sendStatusToWindow(mainWindow, 'available', info);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Update not available');
    sendStatusToWindow(mainWindow, 'not-available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    sendStatusToWindow(mainWindow, 'error', err.message);
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info('Download progress:', progress.percent);
    sendStatusToWindow(mainWindow, 'downloading', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    sendStatusToWindow(mainWindow, 'downloaded', info);
  });

  // IPC handlers for renderer process
  ipcMain.handle('check-for-updates', () => {
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('download-update', () => {
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // Check for updates after launch (with delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Failed to check for updates:', err);
    });
  }, 10000);
}

function sendStatusToWindow(
  win: BrowserWindow | null,
  status: string,
  data?: unknown
): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send('update-status', { status, data });
  }
}
