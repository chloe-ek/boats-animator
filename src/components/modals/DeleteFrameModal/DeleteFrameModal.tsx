import { useNavigate } from "react-router-dom";
import { usePlaybackContext } from "../../../context/PlaybackContext/PlaybackContext";
import { SemanticColor } from "../../ui/Theme/SemanticColor";
import { UiButton } from "../../ui/UiButton/UiButton";
import { UiModal } from "../../ui/UiModal/UiModal";
import { UiModalFooter } from "../../ui/UiModalFooter/UiModalFooter";
import { PageRoute } from "../../../services/PageRoute";

export const DeleteFrameModal = () => {
  const navigate = useNavigate();
  const {
    deleteFrameAtCurrentTimelineIndex,
    deleteSelectedFrames,
    timelineIndex,
    selectedFrameIndices
  } = usePlaybackContext();

  const hasMultipleSelected = selectedFrameIndices.size > 0;
  const frameCount = hasMultipleSelected ? selectedFrameIndices.size : 1;
  const isPlural = frameCount > 1;

  const getDeleteMessage = () => {
    if (hasMultipleSelected) {
      return `This will permanently delete ${frameCount} selected frames.`;
    }
    return `This will permanently delete ${
      timelineIndex === undefined ? "the last frame captured" : `frame ${timelineIndex + 1}`
    }.`;
  };

  const handleDelete = async () => {
    if (hasMultipleSelected) {
      await deleteSelectedFrames?.();
    } else {
      await deleteFrameAtCurrentTimelineIndex?.();
    }
    navigate(PageRoute.ANIMATOR);
  };

  return (
    <UiModal title={`Delete frame${isPlural ? 's' : ''}?`} onClose={PageRoute.ANIMATOR}>
      <p>{getDeleteMessage()}</p>
      <UiModalFooter>
        <UiButton onClick={PageRoute.ANIMATOR}>Cancel</UiButton>
        <UiButton
          onClick={handleDelete}
          semanticColor={SemanticColor.DANGER}
        >
          Delete frame{isPlural ? 's' : ''}
        </UiButton>
      </UiModalFooter>
    </UiModal>
  );
};
