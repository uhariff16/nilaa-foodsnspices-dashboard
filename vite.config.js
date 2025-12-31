import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';

// Data Sync Plugin
const dataSyncPlugin = () => {
  const SOURCE_DIR = 'G:/My Drive/Insvesmets/Nila Foods & Spices/NFS_Data_Sync';
  const TARGET_DIR = path.resolve(__dirname, 'src/data');

  const syncFiles = () => {
    console.log(`[DataSync] Starting sync from ${SOURCE_DIR} to ${TARGET_DIR}...`);
    try {
      if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`[DataSync] Source directory not found: ${SOURCE_DIR}`);
        return { success: false, message: "Source directory not found" };
      }

      // Check access
      try {
        fs.accessSync(SOURCE_DIR, fs.constants.R_OK);
      } catch (err) {
        console.error(`[DataSync] Cannot access source directory: ${err.message}`);
        return { success: false, message: "Cannot access source directory" };
      }

      // Recursive copy helper
      const copyRecursive = (src, dest) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });
        let count = 0;

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            count += copyRecursive(srcPath, destPath);
          } else {
            // Filter for relevant files only (xlsx, xls)
            if (/\.(xlsx|xls)$/i.test(entry.name)) {
              // Compare modified times to avoid unnecessary writes (optional but good)
              let shouldCopy = true;
              if (fs.existsSync(destPath)) {
                const srcStat = fs.statSync(srcPath);
                const destStat = fs.statSync(destPath);
                if (srcStat.mtimeMs <= destStat.mtimeMs) {
                  shouldCopy = false;
                }
              }

              if (shouldCopy) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`[DataSync] Copied: ${entry.name}`);
                count++;
              }
            }
          }
        }
        return count;
      };

      const CopiedCount = copyRecursive(SOURCE_DIR, TARGET_DIR);
      console.log(`[DataSync] Sync completed. Files copied/updated: ${CopiedCount}`);
      return { success: true, count: CopiedCount };

    } catch (error) {
      console.error(`[DataSync] Error during sync:`, error);
      return { success: false, message: error.message };
    }
  };

  // Auto-sync interval (e.g., every 10 minutes)
  // We use a timer reference to clear it on close if needed, but Vite plugin doesn't have explicit 'onClose' easily accessible in simple form.
  // We'll just start it.
  setInterval(() => {
    syncFiles();
  }, 10 * 60 * 1000); // 10 minutes

  return {
    name: 'data-sync-plugin',
    configureServer(server) {
      // API Endpoint for manual trigger
      server.middlewares.use('/api/sync', (req, res, next) => {
        const result = syncFiles();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dataSyncPlugin()],
})
