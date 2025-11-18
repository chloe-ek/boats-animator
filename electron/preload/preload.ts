import { contextBridge, ipcRenderer, shell } from "electron";
import * as path from "path";
import IpcChannel from "../common/ipc/IpcChannel";
import * as Ipc from "../common/ipc/IpcHandler";
import { setListener } from "./ipcRendererUtils";

// This file controls access to the Electron and Node methods required by the renderer process
// https://www.electronjs.org/docs/tutorial/context-isolation
export const api = {
  platform: process.platform,
  joinPath: (...paths: string[]) => path.join(...paths),
  normalizePath: (filePath: string) => path.normalize(filePath),
  ipcToMain: {
    appVersion: (): Ipc.AppVersionResponse => ipcRenderer.invoke(IpcChannel.APP_VERSION),

    checkCameraAccess: (): Ipc.CheckCameraAccessResponse =>
      ipcRenderer.invoke(IpcChannel.CHECK_CAMERA_ACCESS),

    getUserPreferences: (): Ipc.GetUserPreferencesResponse =>
      ipcRenderer.invoke(IpcChannel.GET_USER_PREFERENCES),

    logRenderer: (payload: Ipc.LogRendererPayload): Ipc.LogRendererResponse =>
      ipcRenderer.invoke(IpcChannel.LOG_RENDERER, payload),

    saveSettingsAndClose: (
      payload: Ipc.SaveSettingsAndClosePayload
    ): Ipc.SaveSettingsAndCloseResponse =>
      ipcRenderer.invoke(IpcChannel.SAVE_SETTINGS_AND_CLOSE, payload),

    openUserDataDirectory: (): Ipc.OpenUserDataDirectoryResponse =>
      ipcRenderer.invoke(IpcChannel.OPEN_APP_DATA_DIRECTORY),

    openConfirmPrompt: (payload: Ipc.OpenConfirmPromptPayload): Ipc.OpenConfirmPromptResponse =>
      ipcRenderer.invoke(IpcChannel.OPEN_CONFIRM_PROMPT, payload),

    openDirDialog: (payload: Ipc.OpenDirDialogPayload): Ipc.OpenDirDialogResponse =>
      ipcRenderer.invoke(IpcChannel.OPEN_DIR_DIALOG, payload),

    openExportVideoFilePathDialog: (
      payload: Ipc.OpenExportVideoFilePathDialogPayload
    ): Ipc.OpenExportVideoFilePathDialogResponse =>
      ipcRenderer.invoke(IpcChannel.OPEN_EXPORT_VIDEO_FILE_PATH_DIALOG, payload),

    exportVideoStart: (payload: Ipc.ExportVideoStartPayload): Ipc.ExportVideoStartResponse =>
      ipcRenderer.invoke(IpcChannel.EXPORT_VIDEO_START, payload),

    showItemInFolder: (payload: Ipc.ShowItemInFolderPayload): Ipc.ShowItemInFolderResponse =>
      ipcRenderer.invoke(IpcChannel.SHOW_ITEM_IN_FOLDER, payload),

    copyFramesToTempDirectory: (
      payload: Ipc.CopyFramesToTempDirectoryPayload
    ): Ipc.CopyFramesToTempDirectoryResponse =>
      ipcRenderer.invoke(IpcChannel.COPY_FRAMES_TO_TEMP_DIRECTORY, payload),
    conformTake: (payload: any) => ipcRenderer.invoke(IpcChannel.CONFORM_TAKE, payload),
    exportTake: (payload: any) => ipcRenderer.invoke(IpcChannel.EXPORT_TAKE, payload),
  },
  ipcToRenderer: {
    onCloseButtonClick: (callback: (payload: Ipc.OnCloseButtonClickPayload) => void) =>
      setListener(IpcChannel.ON_CLOSE_BUTTON_CLICK, callback),
    onExportVideoData: (callback: (payload: Ipc.OnExportVideoDataPayload) => void) =>
      setListener(IpcChannel.ON_EXPORT_VIDEO_DATA, callback),
  },
  openExternal: {
    discord: () => shell.openExternal("http://discord.boatsanimator.com"),
    newsPost: (url: string) => shell.openExternal(url),
    website: () => shell.openExternal("https://www.charlielee.uk/boats-animator"),
  },
  getDirectoryPath: async (handle: FileSystemDirectoryHandle): Promise<string> => {
    // @ts-ignore - non-standard method but supported in Chromium-based Electron
    const originPrivateDirectory = await navigator.storage.getDirectory();
    const relativePath = await originPrivateDirectory.resolve(handle);

    if (!relativePath) {
      throw new Error("Could not resolve FileSystemDirectoryHandle to a path.");
    }

    // Construct the full OS path using the user's working directory
    return path.join(process.cwd(), ...relativePath);
  },
};

export type PreloadApi = typeof api;

contextBridge.exposeInMainWorld("preload", api);
