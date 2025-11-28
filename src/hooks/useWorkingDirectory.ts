import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/database/Database";
import { PersistedDirectoryType } from "../services/database/PersistedDirectoryEntry";

const useWorkingDirectory = () => {
  // Query all working directories and take the first one
  // Using toArray() ensures better reactivity than first() for database changes
  const persistedDirectoryEntry = useLiveQuery(
    async () => {
      const results = await db.persistedDirectories
        .where('type')
        .equals(PersistedDirectoryType.WORKING_DIRECTORY)
        .toArray();
      
      return results[0] ?? undefined;
    },
    []
  );

  return persistedDirectoryEntry;
};

export default useWorkingDirectory;
