import { ReactNode, useEffect, useCallback } from "react";
import useProjectDirectory from "../../hooks/useProjectDirectory";
import { FileInfo, FileInfoType } from "../../services/fileManager/FileInfo";
import {
  makeProjectInfoFileJson,
  makeTakeDirectoryName
} from "../../services/project/projectBuilder";
import { useFileManagerContext } from "../FileManagerContext/FileManagerContext";
import { ProjectFilesContext } from "./ProjectFilesContext";

import { useDispatch, useSelector } from "react-redux";
import { addFrameTrackItem, removeFrameTrackItem } from "../../redux/slices/projectSlice";
import { RootState } from "../../redux/store";
import * as rLogger from "../../services/rLogger/rLogger";
import { Project } from "../../services/project/types";
import { Take } from "../../services/project/types";
import { TrackItem } from "../../services/project/types";
import { PROJECT_INFO_FILE_NAME } from "../../services/utils";

interface ProjectFilesContextProviderProps {
  children: ReactNode;
}

export const ProjectFilesContextProvider = ({ children }: ProjectFilesContextProviderProps) => {
  const fileManager = useFileManagerContext();

  const projectDirectory = useProjectDirectory();
  const { project, take } = useSelector((state: RootState) => state.project);
  const appVersion = useSelector((state: RootState) => state.app.appVersion);
  const dispatch = useDispatch();

  const saveTrackItemToDisk = async (
    take: Take,
    trackItem: TrackItem,
    data: Blob
  ): Promise<void> => {
    if (projectDirectory === undefined) {
      throw "Missing projectDirectory";
    }

    const takeDirectoryName = makeTakeDirectoryName(take);
    const takeDirectoryHandle = await fileManager.createDirectory(
      takeDirectoryName,
      projectDirectory.handle
    );

    await fileManager.createFile(
      trackItem.fileInfoId,
      trackItem.fileName,
      takeDirectoryHandle,
      FileInfoType.FRAME,
      data
    );
    dispatch(addFrameTrackItem(trackItem));
  };

  const deleteTrackItem = async (trackItem: TrackItem) => {
    await fileManager.deleteFile(trackItem.fileInfoId);
    dispatch(removeFrameTrackItem(trackItem.id));
  };


  /**
   * Loads existing frame files from disk for a given take.
   * Scans the take directory, matches files to trackItems using their stored fileName property.
   */
  const loadExistingFrameFiles = useCallback(async (take: Take) => {
    if (!projectDirectory) {
      rLogger.warn("loadExistingFrameFiles.noProjectDirectory", "No project directory available");
      return;
    }

    try {
      const takeDirectoryName = makeTakeDirectoryName(take);
      const takeDirectoryHandle = await projectDirectory.handle.getDirectoryHandle(takeDirectoryName);
      
      // Get all JPG files in the take directory
      const frameFiles: FileSystemFileHandle[] = [];
      for await (const [name, handle] of takeDirectoryHandle.entries()) {
        if (handle.kind === 'file' && name.endsWith('.jpg')) {
          frameFiles.push(handle);
        }
      }

      rLogger.info("loadExistingFrameFiles.foundFiles", `Found ${frameFiles.length} frame files in ${takeDirectoryName}`);

      if (frameFiles.length === 0) {
        rLogger.info("loadExistingFrameFiles.noFiles", "No frame files found to load");
        return;
      }

      const trackItemMap = new Map(
        take.frameTrack.trackItems.map(item => [item.fileName, item])
      );

      // Load files in parallel with controlled concurrency to prevent memory issues
      const BATCH_SIZE = 5;
      const loadedFiles: string[] = [];
      const newFileInfos: FileInfo[] = [];
      
      for (let i = 0; i < frameFiles.length; i += BATCH_SIZE) {
        const batch = frameFiles.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (fileHandle) => {
          try {
            const file = await fileHandle.getFile();
            const objectURL = URL.createObjectURL(file);
            
            const matchingTrackItem = trackItemMap.get(fileHandle.name);

            if (matchingTrackItem) {
              const fileInfo = new FileInfo(
                matchingTrackItem.fileInfoId,
                FileInfoType.FRAME,
                fileHandle,
                objectURL
              );
              
              loadedFiles.push(fileHandle.name);
              rLogger.info("loadExistingFrameFiles.loaded", `Loaded frame file: ${fileHandle.name} for trackItem ${matchingTrackItem.id}`);
              return fileInfo;
            } else {
              rLogger.warn("loadExistingFrameFiles.noMatchingTrackItem", `No matching trackItem found for file: ${fileHandle.name}`);
              // Clean up unused object URL to prevent memory leaks
              URL.revokeObjectURL(objectURL);
              return null;
            }
          } catch (error) {
            rLogger.error("loadExistingFrameFiles.fileError", `Error loading file ${fileHandle.name}: ${error}`);
            return null;
          }
        });
        
        // Wait for batch to complete and collect results
        const batchResults = await Promise.all(batchPromises);
        newFileInfos.push(...batchResults.filter((info): info is FileInfo => info !== null));
      }

      // Batch update file manager's fileInfos array (single operation instead of multiple spreads)
      if (newFileInfos.length > 0) {
        (fileManager as any).fileInfos = [...(fileManager as any).fileInfos, ...newFileInfos];
      }

      rLogger.info("loadExistingFrameFiles.completed", `Successfully loaded ${loadedFiles.length} frame files: ${loadedFiles.join(', ')}`);
    } catch (e) {
      rLogger.error("loadExistingFrameFiles.directoryError", `Error accessing take directory: ${e}`);
    }
  }, [projectDirectory, fileManager]);

  const getTrackItemObjectURL = (trackItem: TrackItem): string | undefined => {
    const fileInfo = fileManager.findFile(trackItem.fileInfoId);
    if (fileInfo?.objectURL) {
      return fileInfo.objectURL;
    }

    // For loaded projects, frame files may not be loaded yet
    // Return undefined to show loading state instead of crashing
    rLogger.warn("getTrackItemObjectURL.missingFileInfo", `File info not found for trackItem ${trackItem.id}, fileInfoId: ${trackItem.fileInfoId}`);
    return undefined;
  };

  const updateProjectAndTakeLastSaved = (project: Project, take: Take): [Project, Take[]] => {
    const lastSaved = new Date().toISOString();
    const updatedProject: Project = { ...project, lastSaved };
    const updatedTake: Take = { ...take, lastSaved };
    return [updatedProject, [updatedTake]];
  };

  const saveProjectInfoFileToDisk = async (project: Project, takes: Take[]): Promise<void> => {
    rLogger.info("projectFilesContext.saveProject", "Saving project info file to disk");
    if (projectDirectory === undefined) {
      throw "Unable to save project file info as missing projectDirectory";
    }

    const projectFileInfo = fileManager.findFile(project.fileInfoId);

    const projectFileJson = await makeProjectInfoFileJson(appVersion, project, takes);
    const profileFileString = JSON.stringify(projectFileJson);
    const data = new Blob([profileFileString], { type: "application/json" });

    if (projectFileInfo) {
      rLogger.info(
        "projectFilesContext.saveProject.update",
        `Updating project info file ${projectFileInfo.fileInfoId}`
      );
      await fileManager.updateFile(projectFileInfo.fileInfoId, data);
    } else {
      try {
        const existingFileHandle = await projectDirectory.handle.getFileHandle(PROJECT_INFO_FILE_NAME);
        rLogger.info(
          "projectFilesContext.saveProject.updateExisting",
          `Updating existing project info file in ${projectDirectory.handle.name}`
        );
        
        const writable = await existingFileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        
        // Create a FileInfo entry for the existing file
        const objectURL = URL.createObjectURL(data);
        const newFileInfo = new FileInfo(project.fileInfoId, FileInfoType.PROJECT_INFO, existingFileHandle, objectURL);
        
        // Add to file manager's fileInfos array
        // We need to access the private fileInfos array to add the new file info
        (fileManager as any).fileInfos = [...(fileManager as any).fileInfos, newFileInfo];
        
      } catch {
        rLogger.info(
          "projectFilesContext.saveProject.create",
          `Creating new project info file in ${projectDirectory.handle.name}`
        );
        await fileManager.createFile(
          project.fileInfoId,
          PROJECT_INFO_FILE_NAME,
          projectDirectory.handle,
          FileInfoType.PROJECT_INFO,
          data
        );
      }
    }
  };

  // Auto-load existing frame files when a take is loaded
  useEffect(() => {
    if (!projectDirectory || !take) return;

    // Check if frame files are already loaded for this take
    const hasFrameFiles = take.frameTrack.trackItems.some(trackItem => 
      fileManager.findFile(trackItem.fileInfoId) !== undefined
    );

    if (!hasFrameFiles) {
      rLogger.info("projectFilesContext.autoLoadFrames", `Auto-loading frame files for take: ${take.shotNumber}_${take.takeNumber}`);
      loadExistingFrameFiles(take);
    }
  }, [take, projectDirectory, fileManager, loadExistingFrameFiles]);

  // Saves project data to disk when it changes
  useEffect(() => {
    if (projectDirectory !== undefined && project !== undefined && take !== undefined) {
      const [updatedProject, updatedTakes] = updateProjectAndTakeLastSaved(project, take);
      saveProjectInfoFileToDisk!(updatedProject, updatedTakes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, take, projectDirectory]);

  return (
    <ProjectFilesContext.Provider
      value={{ saveTrackItemToDisk, deleteTrackItem, getTrackItemObjectURL, loadExistingFrameFiles }}
    >
      {children}
    </ProjectFilesContext.Provider>
  );
};
