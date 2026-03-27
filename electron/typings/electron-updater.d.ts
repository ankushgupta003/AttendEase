declare module "electron-updater" {
  export const autoUpdater: {
    autoDownload: boolean;
    checkForUpdates: () => Promise<unknown>;
    downloadUpdate: () => void;
    quitAndInstall: () => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
  };
}
