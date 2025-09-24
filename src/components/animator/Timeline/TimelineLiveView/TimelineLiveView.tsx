import classNames from "classnames";
import { useState } from "react";
import IconName from "../../../common/Icon/IconName";
import IconButton from "../../../common/IconButton/IconButton";
import "./TimelineLiveView.css";

interface TimelineLiveViewProps {
  highlighted: boolean;
  onClick: () => void;
}

const TimelineLiveView = ({ highlighted, onClick }: TimelineLiveViewProps) => {
  const [cameraVisible, setCameraVisible] = useState(true);

  const toggleCamera = () => {
    setCameraVisible(!cameraVisible);
  };

  return (
    <div className="timeline-live-view">
      {cameraVisible ? (
        <IconButton
          icon={IconName.LIVE_VIEW}
          className={classNames("timeline-live-view__button", {
            "timeline-live-view__button--highlighted": highlighted,
          })}
          iconContainerClassName="timeline-live-view__button-icon-container"
          title="Live View"
          onClick={onClick}
          active={highlighted}
        />
      ) : (
        <div className="camera-hidden">Camera hidden 🚫</div>
      )}

      <IconButton
        icon={IconName.CAMERA_TOGGLE}
        className="timeline-live-view__button"
        iconContainerClassName="timeline-live-view__button-icon-container"
        title={cameraVisible ? "Hide Camera" : "Show Camera"}
        onClick={toggleCamera}
        active={!cameraVisible}
      />
    </div>
  );
};

export default TimelineLiveView;
