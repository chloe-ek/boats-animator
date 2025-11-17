import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loadProject, loadTakes } from "../redux/slices/projectSlice";
import { addProjectDirectoryEntry } from "../services/database/PersistedDirectoryEntry";
import { PageRoute } from "../services/PageRoute";
import { ProjectInfoFileV1 } from "../services/project/types";
import { trackRecentProject } from "./useRecentProjects";
import * as rLogger from "../services/rLogger/rLogger";

/**
 * Custom hook that provides project opening functionality.
 * Centralizes the logic for opening projects from directory handles.
 */
export const useProjectOpener = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /**
   * Opens a project from a directory handle and navigates to the animator.
   * @param projectHandle - The FileSystemDirectoryHandle of the project directory
   * @param projectName - The friendly name of the project
   */
  const openProject = useCallback(async (
    projectHandle: FileSystemDirectoryHandle,
    projectName: string
  ): Promise<void> => {
    try {
      rLogger.info("projectOpener.opening", `Opening project: ${projectName}`);

      try {
        const permissionStatus = await projectHandle.requestPermission({ mode: "readwrite" });
        if (permissionStatus !== "granted") {
          throw new Error(`Permission denied for project directory: ${projectName}. Please use "Open Project" to re-select the directory.`);
        }
      } catch (permissionError) {
        rLogger.warn("projectOpener.permissionError", `Permission error for ${projectName}: ${permissionError}`);
        rLogger.info("projectOpener.skippingInvalidProject", `Skipping invalid project: ${projectName}`);
        return;
      }

      // Validate that the directory handle is still valid by attempting to access it
      // This is especially important after a rename operation where the old directory may have been deleted
      let projectInfoFileHandle: FileSystemFileHandle;
      try {
        projectInfoFileHandle = await projectHandle.getFileHandle("project.boatsinfo");
      } catch (e) {
        if (e instanceof DOMException && e.name === "NotFoundError") {
          throw new Error(`Project directory not found. The project "${projectName}" may have been moved, renamed, or deleted. Please use "Open Project" to re-select the directory.`);
        }
        throw e;
      }

      const projectInfoFile = await projectInfoFileHandle.getFile();
      const projectInfoText = await projectInfoFile.text();
      const projectInfo: ProjectInfoFileV1 = JSON.parse(projectInfoText);

      if (!projectInfo.project || !projectInfo.takes || !Array.isArray(projectInfo.takes)) {
        throw new Error("Project file structure is invalid");
      }

      if (projectInfo.takes.length === 0) {
        throw new Error("Project contains no takes");
      }

      const projectDirectoryEntry = await addProjectDirectoryEntry(projectName, projectHandle);

      trackRecentProject(projectDirectoryEntry.id);

      dispatch(loadProject({ 
        project: projectInfo.project, 
        projectDirectoryId: projectDirectoryEntry.id 
      }));
      
      rLogger.info("projectOpener.loadingTakes", `Loading ${projectInfo.takes.length} takes`);
      dispatch(loadTakes(projectInfo.takes));

      // Navigate to animator 
      navigate(PageRoute.ANIMATOR_CAPTURE_SOURCE);

      rLogger.info("projectOpener.opened", `Successfully opened project: ${projectInfo.project.name}`);
    } catch (error) {
      rLogger.error("projectOpener.openError", `Failed to open project: ${error}`);
      throw error;
    }
  }, [dispatch, navigate]);

  return { openProject };
};
