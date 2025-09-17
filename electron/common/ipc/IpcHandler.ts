import LogLevel from "../LogLevel";
import { UserPreferences } from "../UserPreferences";

export type AppVersionPayload = undefined;
export type AppVersionResponse = Promise<string>;

export type CheckCameraAccessPayload = undefined;
export type CheckCameraAccessResponse = Promise<boolean>;

export type GetUserPreferencesPayload = undefined;
export type GetUserPreferencesResponse = Promise<UserPreferences>;

export type LogRendererPayload = {
  logLevel: LogLevel;
  loggingCode: string;
  message?:
    | string
    | number
    | boolean
    | undefined
    | Record<string, string | number | boolean | undefined>;
};
export type LogRendererResponse = Promise<void>;

export type OnCloseButtonClickPayload = undefined;
export type OnCloseButtonClickResponse = Promise<void>;

export type SaveSettingsAndClosePayload = { userPreferences: UserPreferences };
export type SaveSettingsAndCloseResponse = Promise<void>;

export type OpenUserDataDirectoryPayload = undefined;
export type OpenUserDataDirectoryResponse = Promise<void>;

export type OpenConfirmPromptPayload = { message: string };
export type OpenConfirmPromptResponse = Promise<boolean>;

export type OpenDirDialogPayload = {
  workingDirectory: string | undefined;
  title: string;
};
export type OpenDirDialogResponse = Promise<string | undefined>;

export type OpenExportVideoFilePathDialogPayload = {
  currentFilePath: string | undefined;
};
export type OpenExportVideoFilePathDialogResponse = Promise<string | undefined>;

export type ExportVideoStartPayload = {
  ffmpegArguments: string[];
  videoFilePath: string;
};
export type ExportVideoStartResponse = Promise<{ code: number; videoFilePath: string }>;

export type OnExportVideoDataPayload = {
  data: string;
};
export type OnExportVideoDataResponse = Promise<void>;

export type ShowItemInFolderPayload = {
  filePath: string;
};
export type ShowItemInFolderResponse = Promise<void>;

export type CopyFramesToTempDirectoryPayload = {
  frameData: Array<{ fileName: string; data: ArrayBuffer }>;
  tempDirectory: string;
};
export type CopyFramesToTempDirectoryResponse = Promise<string>; // Returns the temp directory path
