const path = require('path');
const fs = require('fs').promises;

const allowedExtensions = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.json', '.xml',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv',
  '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css'
];

const maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB

async function validateFile(file) {
  const errors = [];

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    errors.push(`File type ${ext} is not allowed`);
  }

  if (file.size > maxFileSize) {
    errors.push(`File size exceeds maximum allowed size of 5GB`);
  }

  const filename = path.basename(file.originalname);
  if (!/^[\w\-. ]+$/.test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  return errors;
}

async function cleanupOldFiles(uploadsDir, maxAgeDays = 7) {
  try {
    const files = await fs.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
}

module.exports = {
  validateFile,
  cleanupOldFiles,
  ensureDirectoryExists,
  sanitizeFilename,
  allowedExtensions,
  maxFileSize
};