import { Stack, Text, Group, ActionIcon, Tooltip, Button } from "@mantine/core";
import { useCallback } from "react";
import { notifications } from "@mantine/notifications";
import { db } from "../../../services/database/Database";
import { useProjectOpener } from "../../../hooks/useProjectOpener";
import IconName from "../../common/Icon/IconName";
import Icon from "../../common/Icon/Icon";
import useRecentProjects from "../../../hooks/useRecentProjects";
import * as rLogger from "../../../services/rLogger/rLogger";

/**
 * Component that displays a list of recent projects with the ability to open them.
 */
export const RecentProjects = () => {
  const recentProjects = useRecentProjects();
  const { openProject } = useProjectOpener();

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
   * Handles opening a recent project using the shared project opener hook.
   */
  const handleOpenRecentProject = useCallback(async (projectEntry: any) => {
    try {
      await openProject(projectEntry.handle, projectEntry.friendlyName);
    } catch (error) {
      rLogger.error("recentProjects.openError", `Failed to open recent project: ${error}`);
      
      // Show user-friendly notification and remove invalid entry
      notifications.show({
        title: "Cannot Open Project",
        message: `The project "${projectEntry.friendlyName}" could not be opened. It may have been moved, deleted, or is no longer accessible.`,
        color: "orange",
        autoClose: 5000,
      });
      
      // Automatically remove the invalid entry
      await handleRemoveRecentProject(projectEntry.id);
    }
  }, [openProject, handleRemoveRecentProject]);

  if (recentProjects.length === 0) {
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
      <h3>
        Recent Projects ({recentProjects.length})
      </h3>
      {recentProjects.slice(0, 5).map((project) => (
        <Group key={project.id} justify="center" wrap="nowrap" style={{ width: "60%", margin: "0 auto" }}>
          <Button
            variant="subtle"
            size="md"
            onClick={() => handleOpenRecentProject(project)}
            style={{ justifyContent: "flex-start", flex: 1 }}
            leftSection={<Icon name={IconName.FOLDER} />}
          >
            <Text truncate size="md" fw={500}>
              {project.friendlyName}
            </Text>
          </Button>
          <Tooltip label="Remove from recent projects">
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              onClick={() => handleRemoveRecentProject(project.id)}
            >
              <Icon name={IconName.CLOSE} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ))}
      {recentProjects.length > 5 && (
        <Text size="sm" c="dimmed" ta="center">
          Showing 5 most recent projects
        </Text>
      )}
    </Stack>
  );
};
