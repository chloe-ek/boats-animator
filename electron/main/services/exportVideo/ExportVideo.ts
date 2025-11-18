import ffmpegPath from 'ffmpeg-static';
import { spawn } from "child_process";
import { BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";
import IpcChannel from "../../../common/ipc/IpcChannel";
import { filePathWithoutExtension } from "../fileUtils/fileUtils";
import { sendToRenderer } from "../ipcToMainHandler/IpcToMainHandler";
import logger from "../logger/Logger";
import { conformTake } from "./TakeConformer";
import { ConformResult } from "./TakeConformer";

export const render = (
  win: BrowserWindow,
  ffmpegArguments: string[],
  videoFilePath: string
): Promise<{ code: number; videoFilePath: string }> =>
  new Promise((resolve) => {
    const videoFilePathIndex = ffmpegArguments.findIndex((el) => el === videoFilePath);

    // Add current date to file name if already exists
    if (fs.existsSync(videoFilePath)) {
      const newVideoFilePath = [
        filePathWithoutExtension(videoFilePath),
        `_${Math.floor(new Date().getTime() / 1000)}`,
        path.extname(videoFilePath),
      ].join("");
      logger.info("exportVideo.render.handleExistingFile", {
        videoFilePath,
        newVideoFilePath,
      });
      ffmpegArguments[videoFilePathIndex] = newVideoFilePath;
    }

    logger.info("exportVideo.render.start", ffmpegArguments.join(" "));
    const ffmpeg = spawn(
      (ffmpegPath as string).replace("app.asar", "app.asar.unpacked"),
      ffmpegArguments
    );

    // All ffmpeg output goes to stderrdata
    // https://stackoverflow.com/questions/35169650/
    ffmpeg.stderr.on("data", (data) => {
      logger.info("exportVideo.render.data", data.toString());
      sendToRenderer(win, IpcChannel.ON_EXPORT_VIDEO_DATA, {
        data: data.toString(),
      });
    });

    ffmpeg.on("exit", (code) => {
      resolve({
        code: code ?? 0,
        videoFilePath: ffmpegArguments[videoFilePathIndex],
      });
    });
  });

export interface ExportTakeWithConformOptions {
  projectPath: string;
  takeId: string;
  orderedFramePaths: string[];
  fps: number;
  outputPath: string;
}

/**
 * High-level export that:
 *  1) Builds a conformed, timeline-ordered folder under the project
 *  2) Runs ffmpeg against that folder to produce a video
 *
 * Even if ffmpeg fails, the conform folder + mapping will still exist.
 */
export async function exportTakeWithConform(
  opts: ExportTakeWithConformOptions
): Promise<ConformResult> {
  const { projectPath, takeId, orderedFramePaths, fps, outputPath } = opts;

  // 1) Build conform (this is what makes your frames usable even if export fails)
  const conformResult = await conformTake(projectPath, takeId, orderedFramePaths);
  const conformDir = conformResult.conformDir;

  // 2) Use conform frames for ffmpeg export
  const inputPattern = path.join(conformDir, "%06d.png"); // or jpg, depending on your capture

  logger.info(
    `ExportTakeWithConform: exporting take ${takeId} from ${inputPattern} to ${outputPath} @${fps}fps`
  );

  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      inputPattern,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdout.on("data", (data) => logger.info(`ffmpeg stdout: ${data}`));
    ffmpeg.stderr.on("data", (data) => logger.info(`ffmpeg stderr: ${data}`));

    ffmpeg.on("error", (err) => reject(err));

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        logger.info(`ExportTakeWithConform: Export succeeded: ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

  // DO NOT delete conformResult.conformDir here – user may want to copy it.

  return conformResult;
}
