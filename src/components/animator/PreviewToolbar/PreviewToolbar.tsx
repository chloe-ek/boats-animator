import { Group } from "@mantine/core";
import { useCaptureContext } from "../../../context/CaptureContext/CaptureContext";
import { PlaybackFrameName, usePlaybackContext } from "../../../context/PlaybackContext/PlaybackContext";
import { useImagingDeviceContext } from "../../../context/ImagingDeviceContext/ImagingDeviceContext";
import IconName from "../../common/Icon/IconName";
import { UiActionIcon, UiActionIconRole } from "../../ui/UiActionIcon/UiActionIcon";
import { useHotkeys } from "../../../hooks/useHotkeys";

export const PreviewToolbar = () => {
  const { captureImage } = useCaptureContext();
  const { deviceIdentifier, deviceStatus } = useImagingDeviceContext();
  const {
    stopPlayback,
    liveViewVisible,
    displayFrame,
    deleteFrameAtCurrentTimelineIndex,
    insertModeIndex
  } = usePlaybackContext();

  const handleClickCaptureButton = () => {
    if (!liveViewVisible) {
      stopPlayback();
    }
    captureImage();
  };

  const isCameraDisabled = !deviceIdentifier || !deviceStatus;

  // Show different text when in insert mode
  const captureButtonText = insertModeIndex !== undefined
    ? `Insert Frame After ${insertModeIndex + 1}`
    : "Capture Frame";

  useHotkeys({
    takePicture: isCameraDisabled ? undefined : handleClickCaptureButton,
    prevFrame: () => displayFrame(PlaybackFrameName.PREVIOUS),
    nextFrame: () => displayFrame(PlaybackFrameName.NEXT),
    firstFrame: () => displayFrame(PlaybackFrameName.FIRST),
    lastFrame: () => displayFrame(PlaybackFrameName.LAST),
    deleteFrame: () => deleteFrameAtCurrentTimelineIndex(),
  });

  return (
    <Group justify="center">
      <UiActionIcon
        icon={IconName.CAPTURE}
        onClick={handleClickCaptureButton}
        role={UiActionIconRole.CAPTURE}
        disabled={isCameraDisabled}
      >
        {captureButtonText}
      </UiActionIcon>
    </Group>
  );
};
