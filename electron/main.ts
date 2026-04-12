import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions } from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function ignoreBrokenPipe(stream?: NodeJS.WritableStream | null) {
  if (!stream) return;
  const originalWrite = stream.write.bind(stream);
  stream.write = ((...args: Parameters<typeof originalWrite>) => {
    try {
      return originalWrite(...args);
    } catch (err: any) {
      if (err?.code === "EPIPE") return false;
      throw err;
    }
  }) as typeof stream.write;

  stream.on("error", (err: any) => {
    if (err?.code === "EPIPE") return;
    // Re-throw non-EPIPE errors so they surface normally
    throw err;
  });
}

ignoreBrokenPipe(process.stdout);
ignoreBrokenPipe(process.stderr);

process.on("uncaughtException", (err: any) => {
  if (err?.code === "EPIPE") return;
  throw err;
});

const DEFAULT_PORT = 5000;

const isDev = !app.isPackaged;
const APP_NAME = "AttendEase";

type AppConfig = {
  jwtSecret?: string;
  lastMigratedVersion?: string;
  lastShownReleaseNotesVersion?: string;
};

function loadAppConfig() {
  const userDataDir = app.getPath("userData");
  const configPath = path.join(userDataDir, "config.json");

  let config: AppConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      config = {};
    }
  }

  return { config, configPath };
}

function saveAppConfig(configPath: string, config: AppConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function ensureRuntimeConfig() {
  const { config, configPath } = loadAppConfig();

  if (!config.jwtSecret) {
    config.jwtSecret = crypto.randomBytes(32).toString("hex");
    saveAppConfig(configPath, config);
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET ?? config.jwtSecret;
  return { config, configPath };
}

function loadReleaseNotes(): Record<string, string> {
  try {
    const notesPath = isDev
      ? path.join(process.cwd(), "electron", "release-notes.json")
      : path.join(process.resourcesPath, "release-notes.json");
    if (!fs.existsSync(notesPath)) {
      return {};
    }
    const raw = JSON.parse(fs.readFileSync(notesPath, "utf-8")) as Record<string, string[]>;
    const normalized: Record<string, string> = {};
    for (const [version, lines] of Object.entries(raw)) {
      normalized[version] = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
    }
    return normalized;
  } catch (err) {
    console.error("Failed to load release notes:", err);
    return {};
  }
}

async function ensureDatabase() {
  const userDataDir = app.getPath("userData");
  const dbDir = path.join(userDataDir, "db");
  const dbPath = path.join(dbDir, "attendease.db");

  fs.mkdirSync(dbDir, { recursive: true });

  if (!fs.existsSync(dbPath)) {
    const templatePath = isDev
      ? path.join(process.cwd(), "backend", "prisma", "template.db")
      : path.join(process.resourcesPath, "template.db");

    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath);
    } else {
      console.warn("Template database not found at", templatePath);
    }
  }

  const normalizedPath = dbPath.replace(/\\/g, "/");
  const dbUrl = `file:${normalizedPath}`;
  process.env.DATABASE_URL = dbUrl;

  return { dbPath, dbUrl };
}

function createDbBackup(dbPath: string, versionLabel: string) {
  try {
    if (!fs.existsSync(dbPath)) return;
    const dir = path.dirname(dbPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeVersion = versionLabel.replace(/[^0-9A-Za-z.-]/g, "_");
    const backupName = `attendease-${safeVersion}-${stamp}.db.bak`;
    const backupPath = path.join(dir, backupName);
    fs.copyFileSync(dbPath, backupPath);
  } catch (err) {
    console.error("Database backup failed:", err);
  }
}

async function startBackend() {
  if (isDev) {
    return;
  }

  const { config, configPath } = ensureRuntimeConfig();
  const currentVersion = app.getVersion();
  const shouldMigrate = config.lastMigratedVersion !== currentVersion;
  if (shouldMigrate) {
    process.env.MIGRATE_ON_START = "1";
    config.lastMigratedVersion = currentVersion;
    saveAppConfig(configPath, config);
  }

  const { dbPath } = await ensureDatabase();
  if (shouldMigrate) {
    createDbBackup(dbPath, currentVersion);
  }
  process.env.PORT = String(process.env.PORT ?? DEFAULT_PORT);

  const serverPath = path.join(process.resourcesPath, "backend", "dist", "server.js");
  const serverModule = require(serverPath);

  if (typeof serverModule.startServer !== "function") {
    throw new Error("Backend startServer function not found.");
  }

  serverModule.startServer({ port: Number(process.env.PORT ?? DEFAULT_PORT) });
}

function resolveWindowIconPath() {
  return isDev
    ? path.join(process.cwd(), "public", "favicon.ico")
    : path.join(process.resourcesPath, "favicon.ico");
}

async function createWindow() {
  const iconPath = resolveWindowIconPath();
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    await mainWindow.loadFile(indexPath);
  }

  return mainWindow;
}

async function setupUpdater(mainWindow?: BrowserWindow) {
  if (isDev) {
    return;
  }

  const { autoUpdater } = await import("electron-updater");
  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", async () => {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Update Available",
      message: `A new version of ${APP_NAME} is available.`,
      detail: "Would you like to download it now?",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Update Ready",
      message: "The update has been downloaded.",
      detail: "Restart now to install the update?",
      buttons: ["Restart", "Later"],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (err: unknown) => {
    console.error("Auto update error:", err);
    if (mainWindow) {
      void dialog.showMessageBox(mainWindow, {
        type: "error",
        title: `${APP_NAME} Update Error`,
        message: "Unable to check for updates.",
        detail: String(err)
      });
    }
  });

  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error("Update check failed:", err);
  }
}

app.whenReady().then(async () => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.attendease.app");
  }

  await startBackend();
  const mainWindow = await createWindow();
  const { config, configPath } = ensureRuntimeConfig();
  const currentVersion = app.getVersion();
  const notes = loadReleaseNotes()[currentVersion];
  const shouldShowNotes =
    !isDev &&
    Boolean(notes) &&
    config.lastShownReleaseNotesVersion !== currentVersion;
  if (shouldShowNotes) {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: `${APP_NAME} Updated`,
      message: `What’s New in ${APP_NAME} v${currentVersion}`,
      detail: notes
    });
    config.lastShownReleaseNotesVersion = currentVersion;
    saveAppConfig(configPath, config);
  }

  const createUpdateMenuItem = (): MenuItemConstructorOptions => ({
    label: "Check for Updates",
    click: async () => {
      if (isDev) {
        await dialog.showMessageBox(mainWindow, {
          type: "info",
          title: `${APP_NAME} Updates`,
          message: "Updates are disabled in development mode."
        });
        return;
      }
      try {
        const { autoUpdater } = await import("electron-updater");
        await autoUpdater.checkForUpdates();
      } catch (err) {
        await dialog.showMessageBox(mainWindow, {
          type: "error",
          title: `${APP_NAME} Update Error`,
          message: "Unable to check for updates.",
          detail: String(err)
        });
      }
    }
  });

  const createAboutMenuItem = (): MenuItemConstructorOptions => ({
    label: "About AttendEase",
    click: async () => {
      await dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "AttendEase",
        message: "AttendEase",
        detail: "Smart attendance. Accurate payroll."
      });
    }
  });

  const template: MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" }
      ]
    },
    {
      label: "Help",
      submenu: [
        createUpdateMenuItem(),
        createAboutMenuItem()
      ]
    }
  ];

  if (process.platform !== "win32") {
    template.unshift({
      label: APP_NAME,
      submenu: [
        createUpdateMenuItem(),
        { role: "quit" }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  if (process.platform === "win32") {
    mainWindow.setMenu(menu);
  }

  setupUpdater(mainWindow).catch((err) => {
    console.error("Updater init failed:", err);
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
