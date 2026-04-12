declare module "electron-updater" {
  export const autoUpdater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    allowDowngrade: boolean;
    checkForUpdates: () => Promise<unknown>;
    downloadUpdate: () => void;
    quitAndInstall: () => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
  };
}
