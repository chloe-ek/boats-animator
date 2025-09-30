import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/database/Database";
import { PersistedDirectoryType, PersistedDirectoryEntry } from "../services/database/PersistedDirectoryEntry";

const RECENT_KEY = "recentProjects";
const MAX_RECENT = 5;

/**
 * Track a project as recently opened
 */
export const trackRecentProject = (projectId: string) => {
  const recentIds = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  const newRecentIds = [projectId, ...recentIds.filter((id: string) => id !== projectId)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(newRecentIds));
};

/**
 * Hook to fetch recent project directories sorted by most recently opened
 */
const useRecentProjects = () => {
  const recentProjects = useLiveQuery(
    async () => {
      const recentIds = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      
      if (!recentIds.length) {
        return db.persistedDirectories
          .where('type')
          .equals(PersistedDirectoryType.PROJECT)
          .reverse()
          .limit(MAX_RECENT)
          .toArray();
      }
      
      const projects = await Promise.all(
        recentIds.map((id: string) => db.persistedDirectories.get(id))
      );
      
      return projects.filter(project => 
        project?.type === PersistedDirectoryType.PROJECT
      ) as PersistedDirectoryEntry[];
    },
    []
  );

  return recentProjects || [];
};

export default useRecentProjects;
