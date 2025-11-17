import { v4 as uuidv4 } from "uuid";
import { FileInfoType } from "../fileManager/FileInfo";
import { TrackGroupId } from "../Flavors";
import {
  DEFAULT_PROJECT_DIRECTORY_NAME,
  PROJECT_DIRECTORY_EXTENSION,
  DEFAULT_PROJECT_NAME_FORMATTED,
  zeroPad,
  DEFAULT_PROJECT_NAME,
  CURRENT_PROJECT_INFO_FILE_SCHEMA_VERSION,
} from "../utils";
import { Project, ProjectInfoFileV1 } from "./types";
import { Take } from "./types";
import { TrackItem } from "./types";
interface ProjectBuilderOptions {
  shotNumber: number;
  takeNumber: number;
  frameRate: number;
}

export const makeProject = ({
  name,
  projectFrameRate,
}: {
  name: string;
  projectFrameRate: number;
}): Project => ({
  name: name.substring(0, 256),
  directoryName: makeProjectDirectoryName(name),
  projectFrameRate,
  lastSaved: new Date().toISOString(),
  fileInfoId: uuidv4(),
});


const INVALID_FILENAME_CHARS = /[<>:"/\\|?*.]/g;

/**
 * Removes invalid filename characters from a string.
 */
const removeInvalidFilenameChars = (name: string): string => {
  return name.replace(INVALID_FILENAME_CHARS, "");
};

/**
 * Validates a project name and returns an error message if invalid, or null if valid.
 */
export const validateProjectName = (name: string): string | null => {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Project name cannot be empty";
  }

  // Check if the name contains invalid characters by comparing before/after sanitization
  const sanitized = removeInvalidFilenameChars(trimmed);
  if (sanitized !== trimmed) {
    const invalidChars = trimmed.match(INVALID_FILENAME_CHARS);
    const uniqueInvalidChars = [...new Set(invalidChars || [])].join(" ");
    return `Project name cannot contain the following characters: ${uniqueInvalidChars}`;
  }

  return null;
};

export const makeProjectDirectoryName = (name: string) => {
  const directoryName = removeInvalidFilenameChars(name)
    .substring(0, 60)
    .trim()
    .replace(/ /g, "-");
  return directoryName === ""
    ? DEFAULT_PROJECT_DIRECTORY_NAME
    : `${directoryName}.${PROJECT_DIRECTORY_EXTENSION}`;
};

export const makeUniqueProjectDirectoryNameIfRequired = (directoryName: string) =>
  directoryName === DEFAULT_PROJECT_DIRECTORY_NAME
    ? makeUniqueDefaultProjectDirectoryName()
    : directoryName;

const makeUniqueDefaultProjectDirectoryName = () =>
  `${DEFAULT_PROJECT_NAME_FORMATTED}-${uuidv4().substring(0, 6)}.${PROJECT_DIRECTORY_EXTENSION}`;

export const makeTake = ({ shotNumber, takeNumber, frameRate }: ProjectBuilderOptions): Take => ({
  id: uuidv4(),
  lastSaved: new Date().toISOString(),
  shotNumber,
  takeNumber,
  frameRate,
  holdFrames: 1,
  frameTrack: {
    id: uuidv4(),
    fileType: FileInfoType.FRAME,
    trackItems: [],
  },
});

export const makeFrameTrackItem = (
  take: Take,
  fileNumber: number,
  trackGroupId?: TrackGroupId
): TrackItem => ({
  id: uuidv4(),
  length: 1,
  fileName: makeFrameFileName(take, fileNumber),
  fileNumber,
  trackGroupId: trackGroupId ?? uuidv4(),
  fileInfoId: uuidv4(),
});

export const makeTakeDirectoryName = (take: Take) =>
  `BA_${zeroPad(take.shotNumber, 3)}_${zeroPad(take.takeNumber, 2)}`;

export const makeTakeDirectoryPath = (take: Take) =>
  window.preload.joinPath(`BA_${zeroPad(take.shotNumber, 3)}_${zeroPad(take.takeNumber, 2)}`);

export const makeFrameFileName = (take: Take, frameNumber: number) =>
  [
    "ba",
    zeroPad(take.shotNumber, 3),
    zeroPad(take.takeNumber, 2),
    "frame",
    `${zeroPad(frameNumber, 5)}.jpg`,
  ].join("_");

export const makeProjectInfoFileJson = async (
  appVersion: string,
  project: Project,
  takes: Take[]
): Promise<ProjectInfoFileV1> => ({
  schemaVersion: CURRENT_PROJECT_INFO_FILE_SCHEMA_VERSION,
  appVersion,
  project,
  takes,
});

export const displayProjectTitle = (project: Project) =>
  project.name === "" ? DEFAULT_PROJECT_NAME : project.name;
