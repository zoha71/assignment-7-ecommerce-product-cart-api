const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Mutex / promise-queue keyed by filename to serialize concurrent file access
const fileLocks = new Map();

/**
 * Acquires an exclusive lock for a given file to serialize concurrent operations.
 * @param {string} filename 
 * @param {Function} taskFn 
 * @returns {Promise<any>}
 */
async function withFileLock(filename, taskFn) {
  const previousLock = fileLocks.get(filename) || Promise.resolve();
  let releaseLock;
  const currentLock = new Promise((resolve) => {
    releaseLock = resolve;
  });
  fileLocks.set(filename, currentLock);

  try {
    await previousLock;
    return await taskFn();
  } finally {
    releaseLock();
    if (fileLocks.get(filename) === currentLock) {
      fileLocks.delete(filename);
    }
  }
}

/**
 * Ensures the data directory and target JSON file exist.
 * @param {string} filePath 
 */
async function ensureFileExists(filePath) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '[]\n', 'utf-8');
    }
  } catch (err) {
    console.error(`Error ensuring file exists at ${filePath}:`, err.message);
  }
}

/**
 * Low-level write without acquiring mutex (for use within already acquired locks).
 */
async function writeDirect(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await ensureFileExists(filePath);
  const jsonStr = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, jsonStr, 'utf-8');
  return true;
}

/**
 * Read data from a JSON file in the data/ directory.
 * Returns [] if the file is missing, empty, or contains invalid JSON.
 * @param {string} filename 
 * @returns {Promise<Array>}
 */
async function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  await ensureFileExists(filePath);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed);
  } catch (err) {
    console.warn(`Warning: Could not parse ${filename}, returning empty array. Error: ${err.message}`);
    return [];
  }
}

/**
 * Write data to a JSON file with 2-space pretty printing.
 * Concurrency-safe via mutex queue.
 * @param {string} filename 
 * @param {any} data 
 * @returns {Promise<boolean>}
 */
async function writeData(filename, data) {
  return withFileLock(filename, async () => {
    return await writeDirect(filename, data);
  });
}

/**
 * Atomically execute a read-modify-write cycle inside a single file lock.
 * Guarantees that concurrent requests cannot overwrite intermediate state.
 * @param {string} filename 
 * @param {Function} mutatorFn - function(data) returning updated data (or throwing)
 * @returns {Promise<any>}
 */
async function modifyData(filename, mutatorFn) {
  return withFileLock(filename, async () => {
    const filePath = path.join(DATA_DIR, filename);
    await ensureFileExists(filePath);
    let currentData = [];
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const trimmed = raw.trim();
      currentData = trimmed ? JSON.parse(trimmed) : [];
    } catch {
      currentData = [];
    }

    const updatedData = await mutatorFn(currentData);
    if (updatedData !== undefined) {
      await writeDirect(filename, updatedData);
    }
    return updatedData;
  });
}

module.exports = {
  readData,
  writeData,
  writeDirect,
  modifyData,
  withFileLock
};
