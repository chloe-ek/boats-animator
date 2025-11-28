import { ReactNode, useRef, useState } from "react";
import useLinkedRefAndState from "../../hooks/useLinkedRefAndState";
import useRequestAnimationFrame from "../../hooks/useRequestAnimationFrame";
import {
  getHighlightedTrackItem,
  getLastTrackItem,
  getTrackLength,
} from "../../services/project/projectCalculator";
import * as rLogger from "../../services/rLogger/rLogger";
import { PlaybackContext, PlaybackContextProps, PlaybackFrameName } from "./PlaybackContext";
import { useProjectFilesContext } from "../ProjectFilesContext.tsx/ProjectFilesContext";
import { notifications } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { TimelineIndex } from "../../services/Flavors";

interface PlaybackContextProviderProps {
  children: ReactNode;
}

const PlaybackContextProvider = ({ children }: PlaybackContextProviderProps) => {
  const take = useSelector((state: RootState) => state.project.take);
  const { deleteTrackItem } = useProjectFilesContext();

  const shortPlayLength = useSelector(
    (state: RootState) => state.app.userPreferences.shortPlayLength
  );
  const playbackSpeed = useSelector((state: RootState) => state.project.playbackSpeed);
  const enableShortPlay = useSelector((state: RootState) => state.project.enableShortPlay);

  const playForDuration = take ? getTrackLength(take.frameTrack) : 0;

  // An `undefined` timeline index indicates the application is showing the live view
  const [timelineIndex, timelineIndexRef, setTimelineIndex] = useLinkedRefAndState<
    TimelineIndex | undefined
  >(undefined);
  const [playing, playingRef, setPlaying] = useLinkedRefAndState(false);
  // When in insert mode, the next capture will insert a frame after this index
  const [insertModeIndex, setInsertModeIndex] = useState<TimelineIndex | undefined>(undefined);

  const delay = take ? 1000 / take.frameRate / playbackSpeed : 1000;
  const previousTime = useRef<number>(0);
  const lastFrameIndex = useRef<TimelineIndex>(0);

  const [startRAF, stopRAF] = useRequestAnimationFrame((newTime) => {
    if (!playingRef.current) {
      previousTime.current = newTime;
      setPlaying(true);
    }

    const incrementIfExceedsTime = Math.floor(previousTime.current + delay);

    if (timelineIndexRef.current === undefined || newTime >= incrementIfExceedsTime) {
      previousTime.current = newTime;

      switch (timelineIndexRef.current) {
        case undefined:
          setTimelineIndex(0);
          break;
        case lastFrameIndex.current:
          stopPlayback();
          break;
        default:
          setTimelineIndex(timelineIndexRef.current + 1);
          break;
      }
    }
  });

  const startOrPausePlayback = () => {
    if (playing) {
      return _pausePlayback();
    }

    if (enableShortPlay) {
      return _shortPlay();
    } else {
      return _startPlayback();
    }
  };

  const stopPlayback = (i?: TimelineIndex | undefined) => {
    _logPlayback("playback.stopPlayback");
    stopRAF();
    setPlaying(false);

    if (i === undefined || playForDuration === 0) {
      setTimelineIndex(undefined);
    } else {
      setTimelineIndex(i);
    }

    // Cancel insert mode when playback is stopped
    setInsertModeIndex(undefined);
  };

  const displayFrame = (name: PlaybackFrameName) => {
    switch (name) {
      case PlaybackFrameName.FIRST:
        return _displayFirstFrame();
      case PlaybackFrameName.PREVIOUS:
        return _displayPreviousFrame();
      case PlaybackFrameName.NEXT:
        return _displayNextFrame();
      case PlaybackFrameName.LAST:
        return _displayLastFrame();
    }
  };

  const deleteFrameAtCurrentTimelineIndex = async () => {
    if (!take) {
      rLogger.info(
        "playback.deleteFrameAtCurrentTimelineIndex.noAction",
        "nothing was deleted as no take is loaded"
      );
      return;
    }

    const highlightedTrackItem = getHighlightedTrackItem(take.frameTrack, timelineIndex);
    const trackItem = highlightedTrackItem ?? getLastTrackItem(take.frameTrack);
    if (trackItem === undefined) {
      rLogger.info(
        "playback.deleteFrameAtCurrentTimelineIndex.noAction",
        "nothing was deleted as no track items found"
      );
      return;
    }

    // Calculate next index before deletion
    const currentIndex = timelineIndex;
    const totalFrames = take.frameTrack.trackItems.length;
    let nextIndex: TimelineIndex | undefined;

    if (currentIndex === undefined) {
      // If in live view, stay in live view
      nextIndex = undefined;
    } else if (currentIndex >= totalFrames - 1) {
      // If deleting the last frame, go to the new last frame
      nextIndex = totalFrames - 2 >= 0 ? (totalFrames - 2) as TimelineIndex : undefined;
    } else {
      // Otherwise, stay at the same index (next frame will move to this position)
      nextIndex = currentIndex;
    }

    stopPlayback(nextIndex);
    rLogger.info(
      "playback.deleteFrameAtCurrentTimelineIndex.deleted",
      `deleted track item ${trackItem.fileName}`
    );
    await deleteTrackItem(trackItem);
    notifications.show({ message: "Deleted frame" });
  };

  const playFromHere = (frameIndex: TimelineIndex) => {
    _logPlayback("playback.playFromHere");
    stopPlayback(frameIndex);
    lastFrameIndex.current = playForDuration - 1;
    startRAF();
  };

  const startInsertMode = (afterIndex: TimelineIndex) => {
    _logPlayback("playback.startInsertMode");
    rLogger.info("playback.startInsertMode", `Insert mode started after index ${afterIndex}`);
    setInsertModeIndex(afterIndex);
    // Switch to live view so user can see what they're capturing
    setTimelineIndex(undefined);
  };

  const cancelInsertMode = () => {
    _logPlayback("playback.cancelInsertMode");
    rLogger.info("playback.cancelInsertMode", "Insert mode cancelled");
    setInsertModeIndex(undefined);
  };

  const _startPlayback = () => {
    _logPlayback("playback.startPlayback");
    if (playForDuration > 0) {
      lastFrameIndex.current = playForDuration - 1;
      startRAF();
    }
  };

  const _shortPlay = () => {
    _logPlayback("playback.shortPlay");
    const playFromFrame = playForDuration - shortPlayLength;

    if (playFromFrame > 0) {
      stopPlayback(playFromFrame);
    } else {
      stopPlayback(0);
    }
    _startPlayback();
  };

  const _pausePlayback = () => {
    _logPlayback("playback.pausePlayback");
    stopPlayback(timelineIndex);
  };

  const _displayFirstFrame = () => {
    _logPlayback("playback.displayFirstFrame");
    stopPlayback(0);
  };

  const _displayPreviousFrame = () => {
    _logPlayback("playback.displayPreviousFrame");

    if (timelineIndex === undefined) {
      return stopPlayback(playForDuration - 1);
    }
    if (timelineIndex > 0) {
      return stopPlayback(timelineIndex - 1);
    }
  };

  const _displayNextFrame = () => {
    _logPlayback("playback.displayNextFrame");

    if (timelineIndex === playForDuration - 1) {
      return stopPlayback(undefined);
    }
    if (timelineIndex !== undefined) {
      return stopPlayback(timelineIndex + 1);
    }
  };

  const _displayLastFrame = () => {
    _logPlayback("playback.displayLastFrame");

    if (timelineIndex === playForDuration - 1) {
      return stopPlayback(undefined);
    }
    if (timelineIndex !== undefined) {
      return stopPlayback(playForDuration - 1);
    }
  };

  const _logPlayback = (loggingCode: string) =>
    rLogger.info(loggingCode, {
      playForDuration,
      frameRate: take?.frameRate ?? 0,
      timelineIndex: timelineIndexRef.current ?? "(showing live view)",
    });

  const value: PlaybackContextProps = {
    startOrPausePlayback,
    stopPlayback,
    displayFrame,
    deleteFrameAtCurrentTimelineIndex,
    playFromHere,
    startInsertMode,
    cancelInsertMode,
    timelineIndex,
    insertModeIndex,
    liveViewVisible: timelineIndex === undefined,
    playing,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export default PlaybackContextProvider;
