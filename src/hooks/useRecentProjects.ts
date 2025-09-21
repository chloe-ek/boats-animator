import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/database/Database";
import { PersistedDirectoryType } from "../services/database/PersistedDirectoryEntry";

/**
 * Hook to fetch recent project directories from IndexedDB.
 * Returns project directories sorted by most recently added (newest first).
 */
const useRecentProjects = () => {
  const recentProjects = useLiveQuery(
    () => db.persistedDirectories
      .where('type')
      .equals(PersistedDirectoryType.PROJECT)
      .toArray(), 
    []
  );

  return recentProjects || [];
};

export default useRecentProjects;
