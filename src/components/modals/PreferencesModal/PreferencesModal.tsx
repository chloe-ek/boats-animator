import { ActionIcon, Group, Stack, Title } from "@mantine/core";
import { useDispatch, useSelector } from "react-redux";
import { editUserPreferences } from "../../../redux/slices/appSlice";
import { RootState } from "../../../redux/store";
import IconName from "../../common/Icon/IconName";
import Icon from "../../common/Icon/Icon";
import ToolbarItem, { ToolbarItemAlign } from "../../common/ToolbarItem/ToolbarItem";
import { UiButton } from "../../ui/UiButton/UiButton";
import { UiModal } from "../../ui/UiModal/UiModal";
import { UiModalFooter } from "../../ui/UiModalFooter/UiModalFooter";
import { UiNumberInput } from "../../ui/UiNumberInput/UiNumberInput";
import { UiSwitch } from "../../ui/UiSwitch/UiSwitch";
import { UiTextInput } from "../../ui/UiTextInput/UiTextInput";
import { PageRoute } from "../../../services/PageRoute";
import { usePersistedDirectoriesContext } from "../../../context/PersistedDirectoriesContext/PersistedDirectoriesContext";
import useWorkingDirectory from "../../../hooks/useWorkingDirectory";
import { SemanticColor } from "../../ui/Theme/SemanticColor";

const PreferencesModal = () => {
  const dispatch = useDispatch();
  const { take, userPreferences } = useSelector((state: RootState) => ({
    take: state.project.take,
    userPreferences: state.app.userPreferences,
  }));
  const appVersion = useSelector((state: RootState) => state.app.appVersion);
  const workingDirectory = useWorkingDirectory();
  const { changeWorkingDirectory, removeWorkingDirectory } = usePersistedDirectoriesContext();

  const onChangeDefaultProjectDirectory = async () => {
    await changeWorkingDirectory();
  };

  const onRemoveDefaultProjectDirectory = async () => {
    await removeWorkingDirectory();
  };

  return (
    <UiModal title="Preferences" onClose={take ? PageRoute.ANIMATOR : PageRoute.STARTUP}>
      <Stack>
        <Title order={4}>Interface</Title>
        <UiSwitch
          label="Play capture sound"
          checked={userPreferences.playCaptureSound}
          onChange={() =>
            dispatch(
              editUserPreferences({
                playCaptureSound: !userPreferences.playCaptureSound,
              })
            )
          }
        />
        <UiSwitch
          label="Initially show timestamp in seconds rather than frames"
          checked={userPreferences.showTimestampInSeconds}
          onChange={() =>
            dispatch(
              editUserPreferences({
                showTimestampInSeconds: !userPreferences.showTimestampInSeconds,
              })
            )
          }
        />

        <Title order={4}>Playback</Title>
        <UiNumberInput
          label="Short play length"
          value={userPreferences.shortPlayLength}
          placeholder="6"
          min={1}
          max={99}
          onChange={(newValue) =>
            dispatch(
              editUserPreferences({
                shortPlayLength: newValue,
              })
            )
          }
        />

        <Title order={4}>Project Directory</Title>
        <Group gap="xs" align="flex-end" style={{ width: "100%" }}>
          <div style={{ flex: 1 }}>
            <UiTextInput
              label="Default project directory"
              value={workingDirectory?.friendlyName ?? ""}
              placeholder="No directory selected"
              readOnly
              rightSection={
                <UiButton
                  onClick={onChangeDefaultProjectDirectory}
                  semanticColor={workingDirectory ? SemanticColor.SECONDARY : SemanticColor.PRIMARY}
                >
                  {workingDirectory ? "Change" : "Select"}
                </UiButton>
              }
            />
          </div>
          {workingDirectory && (
            <ActionIcon
              variant="filled"
              color="red"
              size="lg"
              onClick={onRemoveDefaultProjectDirectory}
              aria-label="Remove directory"
            >
              <Icon name={IconName.CLOSE} />
            </ActionIcon>
          )}
        </Group>

        <Title order={4}>Developer</Title>
        <UiSwitch
          label="Show test camera in Capture Sources"
          checked={userPreferences.showTestCamera}
          onChange={() =>
            dispatch(
              editUserPreferences({
                showTestCamera: !userPreferences.showTestCamera,
              })
            )
          }
        />
      </Stack>

      <UiModalFooter>
        <UiButton icon={IconName.FOLDER} onClick={window.preload.ipcToMain.openUserDataDirectory}>
          Open user data folder
        </UiButton>

        <ToolbarItem align={ToolbarItemAlign.RIGHT}>Version {appVersion}</ToolbarItem>
      </UiModalFooter>
    </UiModal>
  );
};

export default PreferencesModal;
