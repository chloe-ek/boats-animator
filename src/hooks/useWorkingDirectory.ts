import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/database/Database";
import { PersistedDirectoryType } from "../services/database/PersistedDirectoryEntry";

const useWorkingDirectory = () => {
  const persistedDirectoryEntry = useLiveQuery(async () => {
    const result = await db.persistedDirectories
      .where('type')
      .equals(PersistedDirectoryType.WORKING_DIRECTORY)
      .first();

    return result ?? undefined;
  });

  return persistedDirectoryEntry;
};

export default useWorkingDirectory;
