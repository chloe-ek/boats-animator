import { Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { DirectoryAccessPermissionError} from "../../../context/PersistedDirectoriesContext/PersistedDirectoriesErrors";
import { useProjectOpener } from "../../../hooks/useProjectOpener";
import { useFileManagerContext } from "../../../context/FileManagerContext/FileManagerContext";
import { PROJECT_INFO_FILE_NAME, PROJECT_DIRECTORY_EXTENSION } from "../../../services/utils";
import { ProjectInfoFileV1 } from "../../../services/project/types";
import IconName from "../../common/Icon/IconName";
import { SemanticColor } from "../../ui/Theme/SemanticColor";
import { UiButton } from "../../ui/UiButton/UiButton";
import { UiModal } from "../../ui/UiModal/UiModal";
import { UiModalFooter } from "../../ui/UiModalFooter/UiModalFooter";
import { UiTextInput } from "../../ui/UiTextInput/UiTextInput";
import { UiAlert } from "../../ui/UiAlert/UiAlert";
import * as rLogger from "../../../services/rLogger/rLogger";
import { PageRoute } from "../../../services/PageRoute";

// Constants for error messages
const ERROR_MESSAGES = {
  PERMISSION_DENIED: "Unable to access the selected folder due to permission restrictions. Please choose a different folder and try again.",
  PROJECT_FILE_MISSING: "This folder does not contain a valid Boats Animator project. The project.boatsinfo file is missing.",
  INVALID_PROJECT: "This folder does not contain a valid Boats Animator project. Please select a different folder.",
  CORRUPTED_PROJECT: "This folder contains a corrupted project file. Please select a different project.",
  NO_TAKES: "This project contains no takes. Please select a different project.",
  UNKNOWN_ERROR: "Unable to open project due to an unexpected error. Please try again.",
} as const;

/**
 * Modal component for opening existing Boats Animator projects.
 * Allows users to select a .boatsfiles directory and load the project.
 */
export const OpenProjectModal = () => {
  const fileManager = useFileManagerContext();
  const { openProject } = useProjectOpener();

  // Consolidated state for better performance
  const [formState, setFormState] = useState({
    selectedProjectPath: "",
    selectedProjectHandle: undefined as FileSystemDirectoryHandle | undefined,
    projectInfo: undefined as ProjectInfoFileV1 | undefined,
    generalError: undefined as string | undefined,
    directoryError: undefined as string | undefined,
  });

  // Memoized helper functions for better performance
  const clearFormErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      generalError: undefined,
      directoryError: undefined,
    }));
  }, []);

  const clearFormState = useCallback(() => {
    setFormState({
      selectedProjectPath: "",
      selectedProjectHandle: undefined,
      projectInfo: undefined,
      generalError: undefined,
      directoryError: undefined,
    });
  }, []);

  const setError = useCallback((type: 'general' | 'directory', message: string) => {
    setFormState(prev => ({
      ...prev,
      [type === 'general' ? 'generalError' : 'directoryError']: message,
    }));
  }, []);

  /**
   * Validates the structure of a loaded project info file.
   * Ensures all required fields and nested structures are present.
   */
  const validateProjectInfo = useCallback((projectInfo: ProjectInfoFileV1): void => {
    if (!projectInfo.project || !projectInfo.takes) {
      throw new Error("Invalid project file structure");
    }
    if (!projectInfo.project.name || !projectInfo.project.directoryName) {
      throw new Error("Project is missing required fields");
    }
    if (!projectInfo.takes.every(take => take.frameTrack?.trackItems)) {
      throw new Error("Take is missing required frameTrack structure");
    }
  }, []);

  const onSelectProjectDirectory = useCallback(async () => {
    clearFormErrors();
    
    try {
      const projectDirectoryHandle = await fileManager.openDirectoryDialog("openProject");
      if (!projectDirectoryHandle) return;

      if (!projectDirectoryHandle.name.endsWith(`.${PROJECT_DIRECTORY_EXTENSION}`)) {
        setError('directory', `Please select a valid project folder (ending with .${PROJECT_DIRECTORY_EXTENSION})`);
        return;
      }
      const projectInfoFile = await projectDirectoryHandle.getFileHandle(PROJECT_INFO_FILE_NAME);
      const projectData = await projectInfoFile.getFile();
      const projectInfoText = await projectData.text();
      const parsedProjectInfo: ProjectInfoFileV1 = JSON.parse(projectInfoText);

      validateProjectInfo(parsedProjectInfo);

      setFormState(prev => ({
        ...prev,
        projectInfo: parsedProjectInfo,
        selectedProjectHandle: projectDirectoryHandle,
        selectedProjectPath: `./${projectDirectoryHandle.name}`,
      }));
      
      rLogger.info("openProjectModal.projectSelected", `Selected project: ${parsedProjectInfo.project.name}`);
    } catch (e) {
      clearFormState();
      
      if (e instanceof DirectoryAccessPermissionError) {
        setError('general', ERROR_MESSAGES.PERMISSION_DENIED);
      } else if (e instanceof DOMException) {
        const message = e.name === "NotFoundError" 
          ? ERROR_MESSAGES.PROJECT_FILE_MISSING 
          : ERROR_MESSAGES.INVALID_PROJECT;
        setError('directory', message);
        rLogger.warn("openProjectModal.invalidProject", `${e.name}: ${e.message}`);
      } else if (e instanceof SyntaxError) {
        setError('directory', ERROR_MESSAGES.CORRUPTED_PROJECT);
        rLogger.warn("openProjectModal.corruptedProject", `${e}`);
      } else {
        setError('general', ERROR_MESSAGES.UNKNOWN_ERROR);
        rLogger.error("openProjectModal.unknownError", `${e}`);
      }
    }
  }, [fileManager, clearFormErrors, clearFormState, validateProjectInfo, setError]);

  const onOpenProject = useCallback(async () => {
    const { selectedProjectHandle, projectInfo } = formState;
    if (!selectedProjectHandle || !projectInfo) return;

    clearFormErrors();

    try {
      if (projectInfo.takes.length === 0) {
        setError('general', ERROR_MESSAGES.NO_TAKES);
        return;
      }

      await openProject(selectedProjectHandle, projectInfo.project.name);
    } catch (e) {
      setError('general', ERROR_MESSAGES.UNKNOWN_ERROR);
      rLogger.error("openProjectModal.openError", `${e}`);
    }
  }, [formState, clearFormErrors, setError, openProject]);

  // Memoized computed values for better performance
  const isProjectSelected = useMemo(() => 
    Boolean(formState.selectedProjectHandle && formState.projectInfo), 
    [formState.selectedProjectHandle, formState.projectInfo]
  );

  const chooseButtonColor = useMemo(() => 
    formState.selectedProjectHandle ? SemanticColor.SECONDARY : SemanticColor.PRIMARY,
    [formState.selectedProjectHandle]
  );

  return (
    <UiModal title="Open Project" onClose={PageRoute.STARTUP}>
      <Stack>
        {formState.generalError && (
          <UiAlert title="Error opening project" semanticColor={SemanticColor.DANGER}>
            {formState.generalError}
          </UiAlert>
        )}
        
        <UiTextInput
          label="Select project folder"
          value={formState.selectedProjectPath}
          placeholder="No project selected"
          readOnly
          error={formState.directoryError}
          rightSection={
            <UiButton
              onClick={onSelectProjectDirectory}
              semanticColor={chooseButtonColor}
            >
              Choose Project
            </UiButton>
          }
        />

        {formState.projectInfo && (
          <Stack gap="xs">
            <UiTextInput
              label="Project Name"
              value={formState.projectInfo.project.name}
              readOnly
            />
            <UiTextInput
              label="Frame Rate"
              value={`${formState.projectInfo.project.projectFrameRate} FPS`}
              readOnly
            />
            <UiTextInput
              label="Takes"
              value={`${formState.projectInfo.takes.length} take(s)`}
              readOnly
            />
          </Stack>
        )}
      </Stack>

      <UiModalFooter>
        <UiButton
          icon={IconName.FOLDER}
          onClick={onOpenProject}
          disabled={!isProjectSelected}
          semanticColor={SemanticColor.PRIMARY}
        >
          Open
        </UiButton>
      </UiModalFooter>
    </UiModal>
  );
};
