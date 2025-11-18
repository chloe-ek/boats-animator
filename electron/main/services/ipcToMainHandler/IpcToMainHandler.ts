import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, systemPreferences } from "electron";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import IpcChannel from "../../../common/ipc/IpcChannel";
import * as Ipc from "../../../common/ipc/IpcHandler";
import { render } from "../exportVideo/ExportVideo";
import { settingsFileStore } from "../fileStore/SettingsFileStore";
import { openUserDataDirectory, showItemInFolder } from "../fileUtils/fileUtils";
import logger, { ProcessName } from "../logger/Logger";
import {
  getWindowSize,
  openConfirmPrompt,
  openDirDialog,
  openExportVideoFilePathDialog,
} from "../windowUtils/windowUtils";
import { conformTake } from "../exportVideo/TakeConformer";

interface ConformTakePayload {
  projectPath: string;          // absolute path to project root
  takeId: string;
  orderedFramePaths: string[];  // absolute paths, timeline order
}

ipcMain.handle(IpcChannel.CONFORM_TAKE, async (_event, payload: ConformTakePayload) => {
  try {
    const { projectPath, takeId, orderedFramePaths } = payload;
    const result = await conformTake(projectPath, takeId, orderedFramePaths);
    logger.info(`Conformed take ${takeId} at ${result.conformDir}`);
    return { ok: true, result };
  } catch (err: any) {
    logger.error("CONFORM_TAKE failed", err);
    return { ok: false, error: err?.message ?? String(err) };
  }
});

ipcMain.handle(IpcChannel.EXPORT_TAKE, async (event, payload) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error("No BrowserWindow found for export");

    const { tempDirectory, fps, outputPath } = payload;
    const inputPattern = path.join(tempDirectory, "ba_001_01_frame_%05d.jpg");
    const ffmpegArguments = `
      -y
      -framerate ${fps}
      -start_number 1
      -i "${inputPattern}"
      -c:v libx264
      -preset medium
      -crf 18
      -vf format=yuv420p
      "${outputPath}"
    `.trim();

    const rawArgs = ffmpegArguments.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const args = rawArgs.map(a =>
      a.replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"')
    );

    logger.info("exportVideo.render.start", args.join(" "));

    await render(win, args, outputPath);
    win.webContents.send("EXPORT_TAKE_FINISHED", { outputPath });
    return { ok: true };

  } catch (err: any) {
    logger.error("EXPORT_TAKE failed", err);
    return { ok: false, error: err?.message ?? String(err) };
  }
});

class IpcToMainHandler {
  appVersion = async (): Ipc.AppVersionResponse => app.getVersion();

  checkCameraAccess = async (): Ipc.CheckCameraAccessResponse => {
    // Only check media access on macOS and Windows (not supported by Linux)
    switch (process.platform) {
      case "win32":
        return systemPreferences.getMediaAccessStatus("camera") === "granted";
      case "darwin":
        return await systemPreferences.askForMediaAccess("camera");
      default:
        return true;
    }
  };

  getUserPreferences = async (): Ipc.GetUserPreferencesResponse =>
    settingsFileStore.get().userPreferences;

  logRenderer = async (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.LogRendererPayload
  ): Ipc.LogRendererResponse => {
    logger.log(payload.logLevel, payload.loggingCode, payload.message, true, ProcessName.RENDERER);
  };

  saveSettingsAndClose = async (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.SaveSettingsAndClosePayload
  ): Ipc.SaveSettingsAndCloseResponse => {
    settingsFileStore.save({
      appWindowSize: getWindowSize(win),
      userPreferences: payload.userPreferences,
    });
    win.destroy();
  };

  openUserDataDirectory = (): Ipc.OpenUserDataDirectoryResponse => openUserDataDirectory();

  openConfirmPrompt = (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.OpenConfirmPromptPayload
  ): Ipc.OpenConfirmPromptResponse => openConfirmPrompt(win, payload.message);

  openDirDialog = (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.OpenDirDialogPayload
  ): Ipc.OpenDirDialogResponse => openDirDialog(win, payload.workingDirectory, payload.title);

  openExportVideoFilePathDialog = (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.OpenExportVideoFilePathDialogPayload
  ): Ipc.OpenExportVideoFilePathDialogResponse =>
    openExportVideoFilePathDialog(win, payload.currentFilePath);

  exportVideoStart = (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.ExportVideoStartPayload
  ): Ipc.ExportVideoStartResponse => render(win, payload.ffmpegArguments, payload.videoFilePath);

  showItemInFolder = (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.ShowItemInFolderPayload
  ): Ipc.ShowItemInFolderResponse => showItemInFolder(payload.filePath);

  copyFramesToTempDirectory = async (
    e: IpcMainInvokeEvent,
    win: BrowserWindow,
    payload: Ipc.CopyFramesToTempDirectoryPayload
  ): Ipc.CopyFramesToTempDirectoryResponse => {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `boats-animator-export-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Write frames with sequential numbering
    for (let i = 0; i < payload.frameData.length; i++) {
      const frame = payload.frameData[i];
      const padded = String(i + 1).padStart(5, "0");
      const fileName = `ba_001_01_frame_${padded}.jpg`;
      const filePath = path.join(tempDir, fileName);
      await fs.writeFile(filePath, Buffer.from(frame.data));
    }
    
    return tempDir;
  };

  static handleIfWindow = (
    channel: IpcChannel,
    listener: (event: IpcMainInvokeEvent, win: BrowserWindow, payload: any) => any
  ) => {
    ipcMain.handle(channel, (event: IpcMainInvokeEvent, payload: any) => {
      if (channel !== IpcChannel.LOG_RENDERER) {
        logger.info(`ipcToMainHandler.${channel}`);
      }
      const win = BrowserWindow.fromWebContents(event.sender);
      return win ? listener(event, win, payload) : undefined;
    });
  };
}

export const addIpcToMainHandlers = () => {
  const ipcHandler = new IpcToMainHandler();

  IpcToMainHandler.handleIfWindow(IpcChannel.APP_VERSION, ipcHandler.appVersion);

  IpcToMainHandler.handleIfWindow(IpcChannel.CHECK_CAMERA_ACCESS, ipcHandler.checkCameraAccess);

  IpcToMainHandler.handleIfWindow(IpcChannel.GET_USER_PREFERENCES, ipcHandler.getUserPreferences);

  IpcToMainHandler.handleIfWindow(IpcChannel.LOG_RENDERER, ipcHandler.logRenderer);

  IpcToMainHandler.handleIfWindow(
    IpcChannel.SAVE_SETTINGS_AND_CLOSE,
    ipcHandler.saveSettingsAndClose
  );

  IpcToMainHandler.handleIfWindow(
    IpcChannel.OPEN_APP_DATA_DIRECTORY,
    ipcHandler.openUserDataDirectory
  );

  IpcToMainHandler.handleIfWindow(IpcChannel.OPEN_CONFIRM_PROMPT, ipcHandler.openConfirmPrompt);

  IpcToMainHandler.handleIfWindow(IpcChannel.OPEN_DIR_DIALOG, ipcHandler.openDirDialog);

  IpcToMainHandler.handleIfWindow(
    IpcChannel.OPEN_EXPORT_VIDEO_FILE_PATH_DIALOG,
    ipcHandler.openExportVideoFilePathDialog
  );

  IpcToMainHandler.handleIfWindow(IpcChannel.EXPORT_VIDEO_START, ipcHandler.exportVideoStart);

  IpcToMainHandler.handleIfWindow(IpcChannel.SHOW_ITEM_IN_FOLDER, ipcHandler.showItemInFolder);

  IpcToMainHandler.handleIfWindow(IpcChannel.COPY_FRAMES_TO_TEMP_DIRECTORY, ipcHandler.copyFramesToTempDirectory);
};

export const sendToRenderer = (
  win: BrowserWindow,
  channel: IpcChannel,
  payload?: Record<string, unknown>
) => win.webContents.send(channel, payload);
