import classNames from "classnames";
import { useCallback, useState } from "react";
import "./TimelineTrackItem.css";
import ContextMenu from "../../../common/ContextMenu/ContextMenu";
import { usePlaybackContext } from "../../../../context/PlaybackContext/PlaybackContext";
import { TimelineIndex } from "../../../../services/Flavors";

interface TimelineTrackItemProps {
  title: string;
  dataUrl: string | undefined;
  highlighted: boolean;
  onClick: () => void;
  onDelete?: () => void;
  frameIndex: TimelineIndex;
}

const TimelineTrackItem = ({ title, dataUrl, highlighted, onClick, onDelete, frameIndex }: TimelineTrackItemProps) => {
  const [menu, setMenu] = useState({ show: false, x: 0, y: 0 });
  const { playFromHere } = usePlaybackContext();

  const scrollRef = useCallback((div: HTMLDivElement | null) => {
    if (div && highlighted) (div as any)?.scrollIntoViewIfNeeded();
  }, [highlighted]);

  const onRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
    setMenu({ show: true, x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className={classNames("timeline-track-item", { "timeline-track-item--loading": !dataUrl })}
        onClick={onClick}
        onContextMenu={onRightClick}
        title={title}
      >
        {dataUrl && (
          <img
            className={classNames("timeline-track-item__img", { "timeline-track-item__img--highlighted": highlighted })}
            src={dataUrl}
          />
        )}
        <div className="timeline-track-item__cover"></div>
        <div className="timetime-track-item__scroll-target" ref={scrollRef}></div>
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
