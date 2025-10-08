import { useNavigate } from "react-router-dom";
import { useProjectFilesContext } from "../../../../context/ProjectFilesContext.tsx/ProjectFilesContext";
import { usePlaybackContext } from "../../../../context/PlaybackContext/PlaybackContext";
import { FileInfoType } from "../../../../services/fileManager/FileInfo";
import {
  getHighlightedTrackItem,
  getTrackItemTitle,
  getTrackItemStartPosition,
} from "../../../../services/project/projectCalculator";
import TimelineLiveViewButton from "../TimelineLiveView/TimelineLiveView";
import TimelineTrackItem from "../TimelineTrackItem/TimelineTrackItem";
import TimelineTrackNoItems from "../TimelineTrackNoItems/TimelineTrackNoItems";
import "./TimelineTrack.css";
import { TimelineIndex } from "../../../../services/Flavors";
import { Track } from "../../../../services/project/types";
import { PageRoute } from "../../../../services/PageRoute";

interface TimelineTrackProps {
  track: Track;
  timelineIndex: TimelineIndex | undefined;
  onClickItem: (trackItemIndex: number) => void;
  onClickLiveView: () => void;
}

const TimelineTrack = ({
  track,
  timelineIndex,
  onClickItem,
  onClickLiveView,
}: TimelineTrackProps) => {
  const navigate = useNavigate();
  const highlightedTrackItem = getHighlightedTrackItem(track, timelineIndex);
  const { getTrackItemObjectURL } = useProjectFilesContext();
  const { stopPlayback } = usePlaybackContext();

  const handleDeleteFrame = (trackItemIndex: number) => {
    stopPlayback(getTrackItemStartPosition(track, trackItemIndex));
    navigate(PageRoute.ANIMATOR_DELETE_FRAME);
  };

  return (
    <div className="timeline-track">
      {track.trackItems.length > 0 ? (
        <>
          {track.trackItems.map((trackItem, i) => {
            const frameIndex = getTrackItemStartPosition(track, i);
            return (
              <TimelineTrackItem
                title={getTrackItemTitle(track, i)}
                dataUrl={getTrackItemObjectURL(trackItem)}
                highlighted={highlightedTrackItem?.id === trackItem.id}
                key={trackItem.id}
                onClick={() => onClickItem(i)}
                onDelete={() => handleDeleteFrame(i)}
                frameIndex={frameIndex}
              />
            );
          })}

          {track.fileType === FileInfoType.FRAME && (
            <TimelineLiveViewButton
              highlighted={timelineIndex === undefined}
              onClick={onClickLiveView}
            />
          )}
        </>
      ) : (
        <TimelineTrackNoItems fileType={track.fileType} />
      )}
    </div>
  );
};

export default TimelineTrack;
