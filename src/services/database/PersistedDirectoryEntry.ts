import { PersistedDirectoryId } from "../Flavors";
import { db } from "./Database";
import { v4 as uuidv4 } from "uuid";
import * as rLogger from "../rLogger/rLogger";

export const enum PersistedDirectoryType {
  WORKING_DIRECTORY = "WORKING_DIRECTORY",
  PROJECT = "PROJECT",
}

export interface PersistedDirectoryEntry {
  id: PersistedDirectoryId;
  type: PersistedDirectoryType;
  friendlyName: string;
  handle: FileSystemDirectoryHandle;
}

const getWorkingDirectoryEntry = async () =>
  db.persistedDirectories.get({
    type: PersistedDirectoryType.WORKING_DIRECTORY,
  });

export const putOrAddWorkingDirectoryEntry = async (handle: FileSystemDirectoryHandle) => {
  const workingDirectory = await getWorkingDirectoryEntry();
  const newEntry: PersistedDirectoryEntry = {
    id: workingDirectory?.id ?? uuidv4(),
    type: PersistedDirectoryType.WORKING_DIRECTORY,
    friendlyName: handle.name,
    handle,
  };

  await db.persistedDirectories.put(newEntry);

  return newEntry;
};

export const addProjectDirectoryEntry = async (
  friendlyName: string,
  handle: FileSystemDirectoryHandle
) => {
  // Check if a project with this friendly name already exists
  const existingEntry = await db.persistedDirectories
    .where('type')
    .equals(PersistedDirectoryType.PROJECT)
    .and(entry => entry.friendlyName === friendlyName)
    .first();

  if (existingEntry) {
    const updatedEntry: PersistedDirectoryEntry = {
      ...existingEntry,
      handle,
    };
    await db.persistedDirectories.put(updatedEntry);
    rLogger.info("addProjectDirectoryEntry.updated", `Updated existing project entry: ${friendlyName}`);
    return updatedEntry;
  } else {
    const newEntry: PersistedDirectoryEntry = {
      id: uuidv4(),
      type: PersistedDirectoryType.PROJECT,
      friendlyName,
      handle,
    };
    await db.persistedDirectories.add(newEntry);
    rLogger.info("addProjectDirectoryEntry.created", `Created new project entry: ${friendlyName}`);
    return newEntry;
  }
};