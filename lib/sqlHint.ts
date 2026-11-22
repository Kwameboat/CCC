import { showToast } from './toast';

/**
 * SQL files are no longer served from the public site. Copy the repository path so an
 * admin can open the file and paste it into the Supabase SQL Editor.
 */
export const copySqlPath = async (path: string) => {
  try {
    await navigator.clipboard.writeText(path);
    showToast(`Copied "${path}". Open it from the repository and run it in the Supabase SQL Editor.`, 'success');
  } catch {
    showToast(`Open ${path} from the repository and run it in the Supabase SQL Editor.`, 'info');
  }
};
