import { createContext, useContext } from "react";
import { TimelineIndex } from "../../services/Flavors";

export const enum PlaybackFrameName {
  FIRST = "FIRST",
  PREVIOUS = "PREVIOUS",
  NEXT = "NEXT",
  LAST = "LAST",
}

export interface PlaybackContextProps {
  startOrPausePlayback: () => void;
  stopPlayback: (i?: TimelineIndex | undefined, pause?: boolean) => void;
  displayFrame: (name: PlaybackFrameName) => void;
  deleteFrameAtCurrentTimelineIndex: () => Promise<void>;
  deleteSelectedFrames: () => Promise<void>;
  playFromHere: (frameIndex: TimelineIndex) => void;
  startInsertMode: (afterIndex: TimelineIndex) => void;
  cancelInsertMode: () => void;
  toggleFrameSelection: (frameIndex: TimelineIndex, multiSelect: boolean) => void;
  clearSelection: () => void;
  timelineIndex: TimelineIndex | undefined;
  insertModeIndex: TimelineIndex | undefined;
  selectedFrameIndices: Set<TimelineIndex>;
  liveViewVisible: boolean;
  playing: boolean;
}

export const PlaybackContext = createContext<PlaybackContextProps | undefined>(undefined);

export const usePlaybackContext = () => {
  const context = useContext(PlaybackContext);

  if (context === undefined) {
    throw new Error("Must be called within PlaybackContextProvider");
  }

  return context;
};
