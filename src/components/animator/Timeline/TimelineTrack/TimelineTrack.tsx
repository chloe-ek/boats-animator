import { useProjectFilesContext } from "../../../../context/ProjectFilesContext.tsx/ProjectFilesContext";
import { FileInfoType } from "../../../../services/fileManager/FileInfo";
import {
  getHighlightedTrackItem,
  getTrackItemTitle,
} from "../../../../services/project/projectCalculator";
import TimelineLiveViewButton from "../TimelineLiveView/TimelineLiveView";
import TimelineTrackItem from "../TimelineTrackItem/TimelineTrackItem";
import TimelineTrackNoItems from "../TimelineTrackNoItems/TimelineTrackNoItems";
import "./TimelineTrack.css";
import { TimelineIndex } from "../../../../services/Flavors";
import { Track } from "../../../../services/project/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDispatch } from "react-redux";
import { reorderFrameTrackItems } from "../../../../redux/slices/projectSlice";

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
  const highlightedTrackItem = getHighlightedTrackItem(track, timelineIndex);
  const { getTrackItemObjectURL } = useProjectFilesContext();
  const dispatch = useDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = track.trackItems.findIndex((item) => item.id === active.id);
      const newIndex = track.trackItems.findIndex((item) => item.id === over.id);

      dispatch(reorderFrameTrackItems({ fromIndex: oldIndex, toIndex: newIndex }));
    }
  };

  return (
    <div className="timeline-track">
      {track.trackItems.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={track.trackItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {track.trackItems.map((trackItem, i) => {
              return (
                <TimelineTrackItem
                  title={getTrackItemTitle(track, i)}
                  dataUrl={getTrackItemObjectURL(trackItem)}
                  highlighted={highlightedTrackItem?.id === trackItem.id}
                  key={trackItem.id}
                  trackItemId={trackItem.id}
                  onClick={() => onClickItem(i)}
                />
              );
            })}
          </SortableContext>

          {track.fileType === FileInfoType.FRAME && (
            <TimelineLiveViewButton
              highlighted={timelineIndex === undefined}
              onClick={onClickLiveView}
            />
          )}
        </DndContext>
      ) : (
        <TimelineTrackNoItems fileType={track.fileType} />
      )}
    </div>
  );
};

export default TimelineTrack;
