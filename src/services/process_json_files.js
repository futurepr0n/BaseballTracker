// process_json_files.js
const fs = require('fs').promises;
const path = require('path');
const { resolveDataPath } = require('../../config/dataPath');

const BASE_DATA_PATH = resolveDataPath('2025');

async function processJsonFile(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (!data.players || !Array.isArray(data.players)) {
            console.warn(`WARN: No 'players' array found or not an array in ${filePath}. Skipping.`);
            return;
        }

        const originalPlayerCount = data.players.length;
        
        // Filter out players that do NOT have a gameId property
        const cleanedPlayers = data.players.filter(player => {
            return player.hasOwnProperty('gameId');
        });

        const removedCount = originalPlayerCount - cleanedPlayers.length;

        if (removedCount > 0) {
            data.players = cleanedPlayers;
            // Write the modified data back to the file
            // Use null, 2 for pretty printing JSON, similar to the input
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`Processed ${filePath}: Removed ${removedCount} player entries. New count: ${cleanedPlayers.length}`);
        } else {
            console.log(`No changes needed for ${filePath}.`);
        }

    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
        if (error instanceof SyntaxError) {
            console.error("This might be due to invalid JSON in the file.");
        }
    }
}

async function main() {
    console.log(`Starting processing in directory: ${BASE_DATA_PATH}`);
    try {
        const monthDirectories = await fs.readdir(BASE_DATA_PATH, { withFileTypes: true });

        for (const monthDirEntry of monthDirectories) {
            if (monthDirEntry.isDirectory()) {
                const monthPath = path.join(BASE_DATA_PATH, monthDirEntry.name);
                console.log(`\nProcessing month: ${monthDirEntry.name}`);
                
                try {
                    const filesInMonthDir = await fs.readdir(monthPath, { withFileTypes: true });
                    
                    for (const fileEntry of filesInMonthDir) {
                        // Expected pattern: {month}_{day}_2025.json
                        // e.g., march_28_2025.json
                        const fileNamePattern = new RegExp(`^${monthDirEntry.name}_\\d{1,2}_2025\\.json$`);

                        if (fileEntry.isFile() && fileNamePattern.test(fileEntry.name)) {
                            const fullFilePath = path.join(monthPath, fileEntry.name);
                            await processJsonFile(fullFilePath);
                        } else if (fileEntry.isFile()) {
                            // console.log(`Skipping file (does not match pattern ${fileNamePattern}): ${fileEntry.name} in ${monthPath}`);
                        }
                    }
                } catch (monthReadError) {
                    console.error(`Error reading directory ${monthPath}:`, monthReadError.message);
                }
            }
        }
        console.log('\nProcessing complete.');

    } catch (error) {
        console.error(`Error reading base data directory ${BASE_DATA_PATH}:`, error.message);
        console.error("Please ensure the directory structure 'public/data/2025/{month}/' exists and is accessible from where the script is run.");
    }
}

// --- To run the script ---
// 1. Save this code as `process_json_files.js` (or any other name).
// 2. Make sure your `public` directory is in the same directory as this script,
//    OR adjust `BASE_DATA_PATH` accordingly.
//    For example, if your script is at `/project/scripts/process_json_files.js`
//    and your data is at `/project/public/data/...`, then
//    `const BASE_DATA_PATH = path.join(__dirname, '..', 'public', 'data', '2025');` might be needed.
// 3. Run from your terminal: `node process_json_files.js`
// 4. **VERY IMPORTANT: Backup your `public/data` directory before running!**

main();