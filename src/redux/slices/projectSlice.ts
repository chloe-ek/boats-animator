import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PersistedDirectoryId, TrackItemId } from "../../services/Flavors";
import { Project, Take, TrackItem } from "../../services/project/types";
import {
  DEFAULT_ONION_SKIN_FRAMES_VISIBLE,
  DEFAULT_ONION_SKIN_OPACITY,
} from "../../services/utils";

interface ProjectState {
  project?: Project;
  take?: Take;
  playbackSpeed: number;
  projectDirectoryId?: PersistedDirectoryId;
  showCapturePane: boolean;
  enableShortPlay: boolean;
  enableOnionSkin: boolean;
  onionSkinOpacity: number;
  onionSkinFramesVisible: number;
}

const initialState: ProjectState = {
  project: undefined,
  take: undefined,
  playbackSpeed: 1,
  projectDirectoryId: undefined,
  showCapturePane: true,
  enableShortPlay: false,
  enableOnionSkin: false,
  onionSkinOpacity: DEFAULT_ONION_SKIN_OPACITY,
  onionSkinFramesVisible: DEFAULT_ONION_SKIN_FRAMES_VISIBLE,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    addProject: (
      state,
      action: PayloadAction<{ project: Project; projectDirectoryId: PersistedDirectoryId }>
    ) => {
      state.project = { ...action.payload.project };
      state.projectDirectoryId = action.payload.projectDirectoryId;
    },

    updateProject: (state, action: PayloadAction<Project>) => {
      if (state.project) {
        state.project = { ...state.project, ...action.payload };
      }
    },

    addFrameTrackItem: (state, action: PayloadAction<TrackItem>) => {
      state.take?.frameTrack.trackItems.push(action.payload);
    },

    removeFrameTrackItem: (state, action: PayloadAction<TrackItemId>) => {
      const index = state.take?.frameTrack.trackItems.findIndex(
        (trackItem) => trackItem.id === action.payload
      );
      if (index === undefined) {
        throw `Unable to find frame track item to remove with id ${action.payload}`;
      }
      state.take?.frameTrack.trackItems.splice(index, 1);
    },
    // Add Redux actions for frame reordering and insertion
    reorderFrameTrackItems: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      if (!state.take) return;
      const { fromIndex, toIndex } = action.payload;
      const items = state.take.frameTrack.trackItems;
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);
    },

    insertFrameTrackItemAt: (
      state,
      action: PayloadAction<{ trackItem: TrackItem; index: number }>
    ) => {
      if (!state.take) return;
      const { trackItem, index } = action.payload;
      state.take.frameTrack.trackItems.splice(index, 0, trackItem);
    },

    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },

    addTake: (state, action: PayloadAction<Take>) => {
      state.take = action.payload;
    },

    loadProject: (
      state,
      action: PayloadAction<{ project: Project; projectDirectoryId: PersistedDirectoryId }>
    ) => {
      state.project = { ...action.payload.project };
      state.projectDirectoryId = action.payload.projectDirectoryId;
    },

    loadTakes: (state, action: PayloadAction<Take[]>) => {
      state.take = action.payload.length > 0 ? action.payload[0] : undefined;
    },

    toggleCapturePane: (state) => {
      state.showCapturePane = !state.showCapturePane;
    },

    setEnableShortPlay: (state, action: PayloadAction<boolean>) => {
      state.enableShortPlay = action.payload;
    },

    setEnableOnionSkin: (state, action: PayloadAction<boolean>) => {
      state.enableOnionSkin = action.payload;
    },

    setOnionSkinOpacity: (state, action: PayloadAction<number>) => {
      state.onionSkinOpacity = action.payload;
    },

    setOnionSkinFramesVisible: (state, action: PayloadAction<number>) => {
      state.onionSkinFramesVisible = action.payload;
    },
  },
});

export const {
  addProject,
  updateProject,
  addFrameTrackItem,
  removeFrameTrackItem,
  reorderFrameTrackItems,
  insertFrameTrackItemAt,
  setPlaybackSpeed,
  addTake,
  loadProject,
  loadTakes,
  toggleCapturePane,
  setEnableShortPlay,
  setEnableOnionSkin,
  setOnionSkinOpacity,
  setOnionSkinFramesVisible,
} = projectSlice.actions;

export const projectReducer = projectSlice.reducer;
