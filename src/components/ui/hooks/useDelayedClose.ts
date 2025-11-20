import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PageRoute } from "../../../services/PageRoute";

export const MODAL_TRANSITION_DURATION = 250;
export const MODAL_CLICK_PROTECTION_BUFFER = 150;

interface UseDelayedCloseProps {
  onClose?: (() => void) | PageRoute;
}

interface UseDelayedCloseResponse {
  opened: boolean;
  duration: number;
  handleClose: () => void;
}

export const useDelayedClose = ({ onClose }: UseDelayedCloseProps): UseDelayedCloseResponse => {
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);
  const duration = MODAL_TRANSITION_DURATION;

  const handleClose = (event?: React.MouseEvent | React.KeyboardEvent) => {
    // Stop event propagation to prevent clicks from reaching elements underneath during modal close
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    close();
    setTimeout(() => (typeof onClose === "string" ? navigate(onClose) : onClose?.()), duration);
  };

  useEffect(() => {
    open();
  }, [open]);

  return { opened, duration, handleClose };
};
