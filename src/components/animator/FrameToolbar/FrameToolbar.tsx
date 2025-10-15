import { Group } from "@mantine/core";
import { useSelector } from "react-redux";
import { useImagingDeviceContext } from "../../../context/ImagingDeviceContext/ImagingDeviceContext";
import { usePlaybackContext } from "../../../context/PlaybackContext/PlaybackContext";
import useProjectAndTake from "../../../hooks/useProjectAndTake";
import { RootState } from "../../../redux/store";
import { PageRoute } from "../../../services/PageRoute";
import { getTrackLength } from "../../../services/project/projectCalculator";
import IconName from "../../common/Icon/IconName";
import { UiActionIcon } from "../../ui/UiActionIcon/UiActionIcon";
import { TitleToolbarTimestamp } from "./TitleToolbarTimestamp/TitleToolbarTimestamp";

export const FrameToolbar = () => {
  const { take } = useProjectAndTake();

  const { liveViewVisible, timelineIndex, startInsertMode } = usePlaybackContext();
  const { deviceIdentifier, deviceStatus } = useImagingDeviceContext();
  const frameTrack = useSelector((state: RootState) => state.project.take?.frameTrack);
  if (frameTrack === undefined) {
    throw "No frame track found in FrameToolbar";
  }

  const handleInsertFrame = () => {
    if (timelineIndex !== undefined) {
      // Start insert mode instead of capturing immediately
      // This will switch to live view so user can see what they're capturing
      startInsertMode(timelineIndex);
    }
  };

  const isCameraDisabled = !deviceIdentifier || !deviceStatus;

  return (
    <Group
      py="sm"
      px="md"
      style={{
        backgroundColor: "var(--mantine-color-default)",
        borderTop: "var(--ba-theme-border)",
      }}
    >
      <TitleToolbarTimestamp take={take} />
      <UiActionIcon
        icon={liveViewVisible ? IconName.UNDO : IconName.DELETE}
        onClick={
          getTrackLength(frameTrack) === 0 ? () => undefined : PageRoute.ANIMATOR_DELETE_FRAME
        }
      >
        {timelineIndex === undefined ? "Undo Last Frame" : `Delete Frame ${timelineIndex + 1}`}
      </UiActionIcon>
      {timelineIndex !== undefined && (
        <UiActionIcon 
          icon={IconName.ADD} 
          onClick={handleInsertFrame}
          disabled={isCameraDisabled}
        >
          Insert Frame After
        </UiActionIcon>
      )}
    </Group>
  );
};
