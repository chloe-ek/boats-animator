import { Stack, Text, Group, ActionIcon, Tooltip, Button, TextInput, useMantineTheme } from "@mantine/core";
import { useCallback, useState, useMemo, memo, useEffect, useRef } from "react";
import { notifications } from "@mantine/notifications";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { db } from "../../../services/database/Database";
import { useProjectOpener } from "../../../hooks/useProjectOpener";
import IconName from "../../common/Icon/IconName";
import Icon from "../../common/Icon/Icon";
import useRecentProjects from "../../../hooks/useRecentProjects";
import * as rLogger from "../../../services/rLogger/rLogger";
import { PersistedDirectoryEntry } from "../../../services/database/PersistedDirectoryEntry";
import { RootState } from "../../../redux/store";
import { updateProject } from "../../../redux/slices/projectSlice";
import { ProjectInfoFileV1 } from "../../../services/project/types";
import { PROJECT_INFO_FILE_NAME } from "../../../services/utils";
import { makeProjectDirectoryName, validateProjectName } from "../../../services/project/projectBuilder";
import { MODAL_TRANSITION_DURATION, MODAL_CLICK_PROTECTION_BUFFER } from "../../ui/hooks/useDelayedClose";

const MAX_DISPLAYED_PROJECTS = 5;
const INVALID_NAME_AUTO_CLOSE = 3000;
const WARNING_AUTO_CLOSE = 5000;
const CLICK_PROTECTION_DURATION = MODAL_TRANSITION_DURATION + MODAL_CLICK_PROTECTION_BUFFER;

// UI styling constants
const ICON_MARGIN_RIGHT = "8px";
const FONT_WEIGHT_MEDIUM = 500;
const PROJECT_ROW_WIDTH_PERCENT = "60%";

/**
 * Updates the project info JSON file on disk with a new project name.
 */
const updateProjectInfoFile = async (
  projectEntry: PersistedDirectoryEntry,
  newName: string
): Promise<void> => {
  const permissionStatus = await projectEntry.handle.requestPermission({ mode: "readwrite" });
  if (permissionStatus !== "granted") {
    throw new Error("Permission denied for project directory");
  }

  // Validate that the directory handle is still valid before accessing files
  // This is especially important after a rename operation
  let projectInfoFileHandle: FileSystemFileHandle;
  try {
    projectInfoFileHandle = await projectEntry.handle.getFileHandle(PROJECT_INFO_FILE_NAME);
  } catch (e) {
    if (e instanceof DOMException && e.name === "NotFoundError") {
      throw new Error(`Project directory not found. The directory may have been moved or deleted.`);
    }
    throw e;
  }

  const projectInfoFile = await projectInfoFileHandle.getFile();
  const projectInfoText = await projectInfoFile.text();
  const projectInfo: ProjectInfoFileV1 = JSON.parse(projectInfoText);

  projectInfo.project.name = newName.trim();
  projectInfo.project.directoryName = makeProjectDirectoryName(newName.trim());

  const updatedProjectInfoText = JSON.stringify(projectInfo);
  const data = new Blob([updatedProjectInfoText], { type: "application/json" });
  const writable = await projectInfoFileHandle.createWritable();
  await writable.write(data);
  await writable.close();
};

/**
 * Project row component for displaying a project in editing mode.
 */
interface EditingProjectRowProps {
  editedName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditingProjectRow = memo(({ editedName, onNameChange, onSave, onCancel }: EditingProjectRowProps) => {
  const theme = useMantineTheme();
  return (
    <>
      <div style={{ marginRight: ICON_MARGIN_RIGHT, flexShrink: 0, display: "flex", alignItems: "center", color: theme.colors.blue[6] }}>
        <Icon name={IconName.FOLDER} />
      </div>
      <TextInput
        value={editedName}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        style={{ flex: 1 }}
        autoFocus
      />
      <Tooltip label="Save">
        <ActionIcon variant="subtle" color="blue" size="md" onClick={onSave}>
          <Icon name={IconName.SAVE} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Cancel">
        <ActionIcon variant="subtle" color="gray" size="md" onClick={onCancel}>
          <Icon name={IconName.CLOSE} />
        </ActionIcon>
      </Tooltip>
    </>
  );
});

EditingProjectRow.displayName = "EditingProjectRow";

/**
 * Project row component for displaying a project in normal mode.
 */
interface ProjectRowProps {
  project: PersistedDirectoryEntry;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

const ProjectRow = memo(({ project, onOpen, onEdit, onRemove }: ProjectRowProps) => (
  <>
    <Button
      variant="subtle"
      size="md"
      onClick={onOpen}
      style={{ justifyContent: "flex-start", flex: 1 }}
      leftSection={<Icon name={IconName.FOLDER} />}
    >
      <Text truncate size="md" fw={FONT_WEIGHT_MEDIUM}>
        {project.friendlyName}
      </Text>
    </Button>
    <Tooltip label="Edit project name">
      <ActionIcon variant="subtle" color="blue" size="md" onClick={onEdit}>
        <Icon name={IconName.PENCIL} />
      </ActionIcon>
    </Tooltip>
    <Tooltip label="Remove from recent projects">
      <ActionIcon variant="subtle" color="red" size="md" onClick={onRemove}>
        <Icon name={IconName.CLOSE} />
      </ActionIcon>
    </Tooltip>
  </>
));

ProjectRow.displayName = "ProjectRow";

/**
 * Component that displays a list of recent projects with the ability to open them.
 */
export const RecentProjects = () => {
  const recentProjects = useRecentProjects();
  const { openProject } = useProjectOpener();
  const dispatch = useDispatch();
  const location = useLocation();
  const previousLocationRef = useRef<string>(location.pathname);
  const [clickProtectionEnabled, setClickProtectionEnabled] = useState(false);

  // Enable click protection after navigation to prevent accidental clicks from modal close
  useEffect(() => {
    const locationChanged = previousLocationRef.current !== location.pathname;
    previousLocationRef.current = location.pathname;

    if (locationChanged && location.pathname === "/startup") {
      setClickProtectionEnabled(true);
      const timer = setTimeout(() => {
        setClickProtectionEnabled(false);
      }, CLICK_PROTECTION_DURATION);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Combine selectors to reduce re-renders
  const { projectDirectoryId, project } = useSelector((state: RootState) => ({
    projectDirectoryId: state.project.projectDirectoryId,
    project: state.project.project,
  }), (prev, next) =>
    prev.projectDirectoryId === next.projectDirectoryId &&
    prev.project === next.project
  );

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>("");

  const displayedProjects = useMemo(
    () => recentProjects.slice(0, MAX_DISPLAYED_PROJECTS),
    [recentProjects]
  );

  const isProjectOpen = useCallback(
    (projectId: string) => projectDirectoryId === projectId && project !== undefined,
    [projectDirectoryId, project]
  );

  const hasMoreProjects = useMemo(
    () => recentProjects.length > MAX_DISPLAYED_PROJECTS,
    [recentProjects.length]
  );

  /**
   * Handles removing a project from recent projects list.
   */
  const handleRemoveRecentProject = useCallback(async (projectId: string) => {
    try {
      await db.persistedDirectories.delete(projectId);
      rLogger.info("recentProjects.removed", `Removed project from recent list: ${projectId}`);
    } catch (error) {
      rLogger.error("recentProjects.removeError", `Failed to remove recent project: ${error}`);
    }
  }, []);

  /**
   * Handles editing a project's friendly name.
   */
  const handleEditProject = useCallback((project: PersistedDirectoryEntry) => {
    setEditingProjectId(project.id);
    setEditedName(project.friendlyName);
  }, []);

  /**
   * Handles saving the edited project name.
   */
  const handleSaveEdit = useCallback(async (projectEntry: PersistedDirectoryEntry) => {
    const trimmedName = editedName.trim();

    // Validate the project name
    const validationError = validateProjectName(trimmedName);
    if (validationError) {
      notifications.show({
        title: "Invalid Project Name",
        message: validationError,
        color: "red",
        autoClose: INVALID_NAME_AUTO_CLOSE,
      });
      return;
    }

    try {
      // Only update the project name in the project file - don't rename the folder
      // This is simpler, more stable, and works for all projects regardless of location
      const updatedEntry: PersistedDirectoryEntry = {
        ...projectEntry,
        friendlyName: trimmedName,
        // Keep the same handle - we're not renaming the folder
      };
      await db.persistedDirectories.put(updatedEntry);
      rLogger.info("recentProjects.updated", `Updated project name in database: ${projectEntry.id} -> ${trimmedName}`);

      try {
        await updateProjectInfoFile(updatedEntry, trimmedName);
        rLogger.info("recentProjects.updatedFile", `Updated project info file: ${projectEntry.id} -> ${trimmedName}`);

        if (isProjectOpen(projectEntry.id) && project) {
          const updatedProject = {
            ...project,
            name: trimmedName,
            // Keep the existing directoryName - we're not renaming the folder
            directoryName: project.directoryName,
          };
          dispatch(updateProject(updatedProject));
          rLogger.info("recentProjects.updatedRedux", `Updated Redux state for open project: ${projectEntry.id}`);
        }
      } catch (fileError) {
        rLogger.error("recentProjects.updateFileError", `Failed to update project info file: ${fileError}`);
        notifications.show({
          title: "Warning",
          message: "Failed to update project file. The change may not persist when opening the project.",
          color: "orange",
          autoClose: WARNING_AUTO_CLOSE,
        });
      }

      setEditingProjectId(null);
      setEditedName("");
    } catch (error) {
      rLogger.error("recentProjects.updateError", `Failed to update project name: ${error}`);
      notifications.show({
        title: "Error",
        message: "Failed to update project name",
        color: "red",
        autoClose: INVALID_NAME_AUTO_CLOSE,
      });
    }
  }, [editedName, isProjectOpen, project, dispatch]);

  /**
   * Handles canceling the edit.
   */
  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditedName("");
  }, []);

  /**
   * Handles opening a recent project using the shared project opener hook.
   */
  const handleOpenRecentProject = useCallback(async (projectEntry: PersistedDirectoryEntry) => {
    // Prevent opening projects if click protection is enabled (e.g., right after modal close)
    if (clickProtectionEnabled) {
      return;
    }

    try {
      await openProject(projectEntry.handle, projectEntry.friendlyName);
    } catch (error) {
      rLogger.error("recentProjects.openError", `Failed to open recent project: ${error}`);

      notifications.show({
        title: "Cannot Open Project",
        message: `The project "${projectEntry.friendlyName}" could not be opened. It may have been moved, deleted, or is no longer accessible.`,
        color: "orange",
        autoClose: WARNING_AUTO_CLOSE,
      });

      await handleRemoveRecentProject(projectEntry.id);
    }
  }, [openProject, handleRemoveRecentProject, clickProtectionEnabled]);

  // Early return for empty state
  if (!recentProjects.length) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          No recent projects found. Create a new project or open an existing one to get started.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <h3>Recent Projects ({recentProjects.length})</h3>
      {displayedProjects.map((project) => {
        const isEditing = editingProjectId === project.id;

        return (
          <Group key={project.id} justify="center" wrap="nowrap" style={{ width: PROJECT_ROW_WIDTH_PERCENT, margin: "0 auto" }}>
            {isEditing ? (
              <EditingProjectRow
                editedName={editedName}
                onNameChange={setEditedName}
                onSave={() => handleSaveEdit(project)}
                onCancel={handleCancelEdit}
              />
            ) : (
              <ProjectRow
                project={project}
                onOpen={() => handleOpenRecentProject(project)}
                onEdit={() => handleEditProject(project)}
                onRemove={() => handleRemoveRecentProject(project.id)}
              />
            )}
          </Group>
        );
      })}
      {hasMoreProjects && (
        <Text size="sm" c="dimmed" ta="center">
          Showing {MAX_DISPLAYED_PROJECTS} most recent projects
        </Text>
      )}
    </Stack>
  );
};
