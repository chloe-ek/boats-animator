import { Group } from "@mantine/core";
import { useCaptureContext } from "../../../context/CaptureContext/CaptureContext";
import { usePlaybackContext } from "../../../context/PlaybackContext/PlaybackContext";
import IconName from "../../common/Icon/IconName";
import { UiActionIcon, UiActionIconRole } from "../../ui/UiActionIcon/UiActionIcon";
import { useEffect } from "react";

export const PreviewToolbar = () => {
  const { captureImage } = useCaptureContext();
  const { stopPlayback, liveViewVisible } = usePlaybackContext();

  const handleClickCaptureButton = () => {
    if (!liveViewVisible) {
      stopPlayback();
    }
    captureImage();
  };

  // hotkey for space to capture frame
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        handleClickCaptureButton();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [liveViewVisible]);

  return (
    <Group justify="center">
      <UiActionIcon
        icon={IconName.CAPTURE}
        onClick={handleClickCaptureButton}
        role={UiActionIconRole.CAPTURE}
      >
        Capture Frame
      </UiActionIcon>
    </Group>
  );
};
