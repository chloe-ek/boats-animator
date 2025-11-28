import { notifications } from "@mantine/notifications";
import { ReactNode } from "react";
import { useSelector, useDispatch } from "react-redux";
import cameraSound from "../../audio/camera.wav";
import useProjectAndTake from "../../hooks/useProjectAndTake";
import { RootState } from "../../redux/store";
import { makeFrameTrackItem } from "../../services/project/projectBuilder";
import { getNextFileNumber, getNextAvailableFileNumber } from "../../services/project/projectCalculator";
import * as rLogger from "../../services/rLogger/rLogger";
import { useImagingDeviceContext } from "../ImagingDeviceContext/ImagingDeviceContext";
import { CaptureContext } from "./CaptureContext";
import { useProjectFilesContext } from "../ProjectFilesContext.tsx/ProjectFilesContext";
import { insertFrameTrackItemAt } from "../../redux/slices/projectSlice";
import { usePlaybackContext } from "../PlaybackContext/PlaybackContext";

interface CaptureContextProviderProps {
  children: ReactNode;
}

const CaptureContextProvider = ({ children }: CaptureContextProviderProps) => {
  const { take } = useProjectAndTake();
  const playCaptureSound = useSelector(
    (state: RootState) => state.app.userPreferences.playCaptureSound
  );
  const { saveTrackItemToDisk } = useProjectFilesContext();
  const { captureImageRaw, deviceStatus } = useImagingDeviceContext();
  const dispatch = useDispatch();
  const { insertModeIndex, cancelInsertMode, stopPlayback } = usePlaybackContext();

  const captureImage = async () => {
    rLogger.info("captureContextProvider.captureImage");
    if (deviceStatus === undefined) {
      rLogger.info("captureDeviceNotReady", "Nothing captured as device is not ready yet");
      return;
    }

    // Check if we're in insert mode
    if (insertModeIndex !== undefined) {
      rLogger.info("captureImage.insertMode", `Capturing in insert mode at index ${insertModeIndex + 1}`);
      const insertIndex = insertModeIndex + 1;
      await captureImageAtIndex(insertIndex);
      cancelInsertMode();
      // Move to the inserted frame
      stopPlayback(insertIndex);
      return;
    }

    if (playCaptureSound) {
      rLogger.info("playCaptureSound");
      const audio = new Audio(cameraSound);
      audio.play();
    }

    try {
      const imageData = await captureImageRaw();
      if (imageData === undefined) {
        throw "Unable to captureImage as no imageData returned";
      }

      const fileNumber = getNextFileNumber(take.frameTrack);
      const trackItem = makeFrameTrackItem(take, fileNumber);
      await saveTrackItemToDisk(take, trackItem, imageData);
    } catch (e) {
      rLogger.warn(
        "captureImageError",
        `There was an unexpected error capturing with this device ${e}`
      );
      notifications.show({
        message:
          "There was an unexpected error capturing with this Capture Source. Please wait and try again.",
      });
    }
  };

  const captureImageAtIndex = async (index: number) => {
    rLogger.info("captureContextProvider.captureImageAtIndex", `Inserting at index ${index}`);
    if (deviceStatus === undefined) {
      rLogger.info("captureDeviceNotReady", "Nothing captured as device is not ready yet");
      return;
    }

    if (playCaptureSound) {
      rLogger.info("playCaptureSound");
      const audio = new Audio(cameraSound);
      audio.play();
    }

    try {
      const imageData = await captureImageRaw();
      if (imageData === undefined) {
        throw "Unable to captureImage as no imageData returned";
      }

      // Use getNextAvailableFileNumber to avoid filename conflicts when inserting
      const fileNumber = getNextAvailableFileNumber(take.frameTrack);
      const trackItem = makeFrameTrackItem(take, fileNumber);

      // Save to disk only (without dispatching addFrameTrackItem)
      await saveTrackItemToDisk(take, trackItem, imageData, true);

      // Insert at specific index - this is the only place we add to redux
      dispatch(insertFrameTrackItemAt({ trackItem, index }));

      rLogger.info("captureImageAtIndex.success", `Successfully inserted frame at index ${index}`);
    } catch (e) {
      rLogger.warn(
        "captureImageAtIndexError",
        `There was an unexpected error capturing at index ${index}: ${e}`
      );
      notifications.show({
        message:
          "There was an unexpected error capturing with this Capture Source. Please wait and try again.",
      });
    }
  };

  return (
    <CaptureContext.Provider
      value={{
        captureImage,
        captureImageAtIndex,
      }}
    >
      {children}
    </CaptureContext.Provider>
  );
};

export default CaptureContextProvider;
