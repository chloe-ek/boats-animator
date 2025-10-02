type HotkeyActions = {
  takePicture?: () => void;
  prevFrame?: () => void;
  nextFrame?: () => void;
  firstFrame?: () => void;
  lastFrame?: () => void;
  deleteFrame?: () => void;
  decreaseBigness?: () => void;
  increaseBigness?: () => void;
};

export function initHotkeys(actions: HotkeyActions) {
  const handler = (e: KeyboardEvent) => {
    switch (e.key) {
      case " ":
        e.preventDefault();
        actions.takePicture?.();
        break;

      case ",":
        actions.prevFrame?.();
        break;

      case ".":
        actions.nextFrame?.();
        break;

      case "Home":
        actions.firstFrame?.();
        break;

      case "End":
        actions.lastFrame?.();
        break;

      case "Delete":
        actions.deleteFrame?.();
        break;

      case "-":
        actions.decreaseBigness?.();
        break;

      case "=":
      case "+":
        actions.increaseBigness?.();
        break;
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
