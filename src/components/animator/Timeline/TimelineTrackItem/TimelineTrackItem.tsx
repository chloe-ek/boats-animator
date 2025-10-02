import classNames from "classnames";
import { useCallback } from "react";
import "./TimelineTrackItem.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TimelineTrackItemProps {
  title: string;
  dataUrl: string | undefined;
  highlighted: boolean;
  trackItemId: string;
  onClick: () => void;
}

const TimelineTrackItem = ({
  title,
  dataUrl,
  highlighted,
  trackItemId,
  onClick,
}: TimelineTrackItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: trackItemId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const scrollTargetRef = useCallback(
    (scrollTargetDiv: HTMLDivElement | null) => {
      if (scrollTargetDiv && highlighted) {
        // Note: this is a non-standard webkit method
        (scrollTargetDiv as any)?.scrollIntoViewIfNeeded();
      }
    },
    [highlighted]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classNames("timeline-track-item", {
        "timeline-track-item--loading": dataUrl === undefined,
      })}
      onClick={onClick}
      title={title}
      {...attributes}
      {...listeners}
    >
      {dataUrl !== undefined && (
        <img
          className={classNames("timeline-track-item__img", {
            "timeline-track-item__img--highlighted": highlighted,
          })}
          src={dataUrl}
        />
      )}
      <div className="timeline-track-item__cover"></div>
      <div className="timetime-track-item__scroll-target" ref={scrollTargetRef}></div>
    </div>
  );
};

export default TimelineTrackItem;
