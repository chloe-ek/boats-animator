import classNames from "classnames";
import { useCallback, useState } from "react";
import "./TimelineTrackItem.css";
import ContextMenu from "../../../common/ContextMenu/ContextMenu";
import { usePlaybackContext } from "../../../../context/PlaybackContext/PlaybackContext";
import { TimelineIndex } from "../../../../services/Flavors";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TimelineTrackItemProps {
  title: string;
  dataUrl: string | undefined;
  highlighted: boolean;
  trackItemId: string;
  onClick: () => void;
  onDelete?: () => void;
  frameIndex: TimelineIndex;
}

const TimelineTrackItem = ({
  title,
  dataUrl,
  highlighted,
  trackItemId,
  onClick,
  onDelete,
  frameIndex,
}: TimelineTrackItemProps) => {
  const [menu, setMenu] = useState({ show: false, x: 0, y: 0 });
  const { playFromHere } = usePlaybackContext();
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

  const handleClick = (_e: React.MouseEvent) => {
    // Only call onClick if we're not currently dragging
    if (!isDragging) {
      onClick();
    }
  };

  const onRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
    setMenu({ show: true, x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={classNames("timeline-track-item", {
          "timeline-track-item--loading": dataUrl === undefined,
        })}
        onClick={handleClick}
        onContextMenu={onRightClick}
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
        {/* Drag handle - visual indicator */}
        <div 
          className="timeline-track-item__drag-handle"
          title="Drag to reorder"
        />
      </div>
      
      <ContextMenu
        visible={menu.show}
        position={{ x: menu.x, y: menu.y }}
        items={[
          { label: "Play from here", onClick: () => playFromHere(frameIndex), disabled: false },
          { label: "Delete", onClick: onDelete || (() => {}), disabled: !onDelete },
          { label: "More...", onClick: () => {}, disabled: false }
        ]}
        onClose={() => setMenu({ show: false, x: 0, y: 0 })}
      />
    </>
  );
};

export default TimelineTrackItem;
