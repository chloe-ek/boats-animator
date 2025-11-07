import { createTheme, DEFAULT_THEME, MantineProvider } from "@mantine/core";
import { ReactNode, useEffect, useMemo, useState } from "react";

import "@mantine/core/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { SemanticColor } from "./SemanticColor";
import "./Theme.css";
import { initHotkeys } from "../../../services/hotkeys";

interface ThemeProps {
  children: ReactNode;
}

const BASE_SCALE = 0.925;
const SCALE_STEP = 0.05;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.25;

export const Theme = ({ children }: ThemeProps) => {
  const [scale, setScale] = useState(BASE_SCALE);

  const theme = useMemo(
    () =>
      createTheme({
        fontFamily: "Open Sans, sans-serif",
        autoContrast: true,
        colors: {
          [SemanticColor.PRIMARY]: DEFAULT_THEME.colors.blue,
          [SemanticColor.SECONDARY]: DEFAULT_THEME.colors.gray,
          [SemanticColor.TITLE]: DEFAULT_THEME.colors.dark,
          [SemanticColor.SUCCESS]: DEFAULT_THEME.colors.green,
          [SemanticColor.DANGER]: DEFAULT_THEME.colors.red,
        },
        primaryColor: SemanticColor.PRIMARY,
        scale,
      }),
    [scale]
  );

  useEffect(() => {
    const cleanup = initHotkeys({
      increaseBigness: () => setScale((s) => Math.min(s + SCALE_STEP, MAX_SCALE)),
      decreaseBigness: () => setScale((s) => Math.max(s - SCALE_STEP, MIN_SCALE)),
    });
    return cleanup;
  }, []);

  return (
    <MantineProvider forceColorScheme="dark" theme={theme}>
      <Notifications />
      {children}
    </MantineProvider>
  );
};
