declare module "electron-updater" {
  export const autoUpdater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    allowDowngrade: boolean;
    checkForUpdates: () => Promise<unknown>;
    downloadUpdate: () => void;
    quitAndInstall: (isSilent?: boolean, isForceRunAfter?: boolean) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
  };
}
