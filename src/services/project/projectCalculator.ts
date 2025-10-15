import { FileInfoType } from "../fileManager/FileInfo";
import { FrameCount, TimelineIndex } from "../Flavors";
import { Track, TrackItem } from "./types";

export const getTrackItemsLength = (trackItems: TrackItem[]): FrameCount =>
  trackItems.reduce((prev, trackItem) => prev + trackItem.length, 0);

export const getTrackLength = (track: Track): FrameCount => getTrackItemsLength(track.trackItems);

// TODO should error if no track item is found
export const getTrackItemStartPosition = (track: Track, trackItemIndex: number): TimelineIndex =>
  getTrackItemsLength(track.trackItems.slice(0, trackItemIndex)) as TimelineIndex;

export const getTrackItemEndPosition = (track: Track, trackItemIndex: number): TimelineIndex =>
  getTrackItemsLength(track.trackItems.slice(0, trackItemIndex + 1)) as TimelineIndex;

export const getHighlightedTrackItem = (
  track: Track,
  timelineIndex: TimelineIndex | undefined
): TrackItem | undefined =>
  timelineIndex === undefined
    ? undefined
    : track.trackItems.find(
        (_trackItem, index) => getTrackItemStartPosition(track, index) >= timelineIndex
      );

export const getTrackItemTitle = (track: Track, trackItemIndex: number) =>
  track.fileType === FileInfoType.FRAME
    ? `Frame ${getTrackItemStartPosition(track, trackItemIndex) + 1}`
    : track.trackItems[trackItemIndex].fileName;

const getLastFileNumberInTrack = (track: Track): number => track.trackItems.at(-1)?.fileNumber ?? 0;

export const getNextFileNumber = (track: Track): number => getLastFileNumberInTrack(track) + 1;

/**
 * Returns the next available unique file number not currently used by any track item.
 * This is useful when inserting frames in the middle of a track to avoid filename conflicts.
 */
export const getNextAvailableFileNumber = (track: Track): number => {
  if (track.trackItems.length === 0) {
    return 1;
  }

  // Get all existing file numbers
  const existingNumbers = new Set(track.trackItems.map(item => item.fileNumber));

  // Find the first unused number starting from 1
  let candidate = 1;
  while (existingNumbers.has(candidate)) {
    candidate++;
  }

  return candidate;
};

export const getLastTrackItem = (track: Track): TrackItem | undefined => track.trackItems.at(-1);
