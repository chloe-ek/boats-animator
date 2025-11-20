import { Group, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Action, ThunkDispatch } from "@reduxjs/toolkit";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Content from "../../common/Content/Content";
import ContentBlock from "../../common/ContentBlock/ContentBlock";
import IconName from "../../common/Icon/IconName";
import Page from "../../common/Page/Page";
import PageBody from "../../common/PageBody/PageBody";
import Sidebar from "../../common/Sidebar/Sidebar";
import SidebarBlock from "../../common/SidebarBlock/SidebarBlock";
import { SemanticColor } from "../../ui/Theme/SemanticColor";
import { UiButton } from "../../ui/UiButton/UiButton";
import NewsFeed from "../NewsFeed/NewsFeed";
import { RecentProjects } from "../RecentProjects/RecentProjects";
import { PageRoute } from "../../../services/PageRoute";
import useWorkingDirectory from "../../../hooks/useWorkingDirectory";
import { usePersistedDirectoriesContext } from "../../../context/PersistedDirectoriesContext/PersistedDirectoriesContext";
import { addProject, addTake } from "../../../redux/slices/projectSlice";
import { RootState } from "../../../redux/store";
import {
  makeProject,
  makeTake,
  makeUniqueProjectDirectoryNameIfRequired,
} from "../../../services/project/projectBuilder";
import { DEFAULT_PROJECT_FRAME_RATE, PROJECT_DIRECTORY_EXTENSION } from "../../../services/utils";
import * as rLogger from "../../../services/rLogger/rLogger";

export const StartupPage = () => {
  const workingDirectory = useWorkingDirectory();
  const dispatch: ThunkDispatch<RootState, void, Action> = useDispatch();
  const navigate = useNavigate();
  const { checkWorkingDirectoryPermission, addProjectDirectory } =
    usePersistedDirectoriesContext();

  const onQuickCreateProject = useCallback(async () => {
    if (!workingDirectory) {
      rLogger.warn("startupPage.quickCreateProject.noWorkingDirectory", "No working directory set");
      notifications.show({
        title: "Working Directory Required",
        message: "Please choose a working directory in Preferences before using Quick Create.",
        color: "orange",
      });
      return;
    }

    try {
      await checkWorkingDirectoryPermission();
    } catch (e) {
      rLogger.error("startupPage.quickCreateProject.permissionError", `Permission error: ${e}`);
      notifications.show({
        title: "Permission Required",
        message:
          "Boats Animator no longer has permission to access the working directory. Please re-select it in Preferences.",
        color: "orange",
      });
      return;
    }

    try {
      const project = makeProject({ name: "", projectFrameRate: DEFAULT_PROJECT_FRAME_RATE });
      const uniqueDirectoryName = makeUniqueProjectDirectoryNameIfRequired(project.directoryName);

      // Use the directory name as the project name if no name provided
      let finalProjectName = project.name;
      if (uniqueDirectoryName !== project.directoryName && !project.name.trim()) {
        finalProjectName = uniqueDirectoryName.replace(`.${PROJECT_DIRECTORY_EXTENSION}`, "");
      }

      const formattedProject = {
        ...project,
        name: finalProjectName,
        directoryName: uniqueDirectoryName,
      };

      const projectDirectoryEntry = await addProjectDirectory(formattedProject);
      dispatch(
        addProject({ project: formattedProject, projectDirectoryId: projectDirectoryEntry.id })
      );

      const take = makeTake({
        shotNumber: 1,
        takeNumber: 1,
        frameRate: formattedProject.projectFrameRate,
      });
      dispatch(addTake(take));

      rLogger.info("startupPage.quickCreateProject.created", `Quick created project: ${formattedProject.name}`);
      navigate(PageRoute.ANIMATOR_CAPTURE_SOURCE);
    } catch (e) {
      rLogger.error("startupPage.quickCreateProject.error", `Failed to create project: ${e}`);
      notifications.show({
        title: "Quick Create Failed",
        message:
          e instanceof Error
            ? e.message
            : "An unexpected error occurred while creating the project. Please try again or create a project manually.",
        color: "red",
      });
    }
  }, [workingDirectory, dispatch, navigate, checkWorkingDirectoryPermission, addProjectDirectory]);

  return (
    <Page>
      <PageBody>
        <Content>
          <ContentBlock title="Welcome to Boats Animator!">
            <Stack justify="stretch" flex={1}>
              <Group>
                {workingDirectory && (
                  <UiButton
                    icon={IconName.ADD}
                    onClick={onQuickCreateProject}
                    semanticColor={SemanticColor.PRIMARY}
                  >
                    Quick Create
                  </UiButton>
                )}
                <UiButton
                  icon={IconName.ADD}
                  onClick={PageRoute.STARTUP_NEW_PROJECT_MODAL}
                  semanticColor={workingDirectory ? SemanticColor.SECONDARY : SemanticColor.PRIMARY}
                >
                  New Project
                </UiButton>
                <UiButton icon={IconName.FOLDER} onClick={PageRoute.STARTUP_OPEN_PROJECT_MODAL}>
                  Open Project
                </UiButton>
              </Group>
              <UiButton icon={IconName.SETTINGS} onClick={PageRoute.STARTUP_PREFERENCES_MODAL}>
                Preferences
              </UiButton>
              <RecentProjects />
            </Stack>
          </ContentBlock>
        </Content>

      <Sidebar>
        <SidebarBlock title="News">
          <NewsFeed />
        </SidebarBlock>
      </Sidebar>
    </PageBody>
  </Page>
  );
};
