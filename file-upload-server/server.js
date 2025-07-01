const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { validateFile, cleanupOldFiles, ensureDirectoryExists, sanitizeFilename } = require('./upload-utils');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitized = sanitizeFilename(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024 // 5GB max file size
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validationErrors = await validateFile(req.file);
    if (validationErrors.length > 0) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: 'File validation failed', 
        details: validationErrors 
      });
    }

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file after error:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

const chunkedUploads = new Map();

app.post('/upload/chunk', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
  try {
    const { 
      uploadId, 
      chunkIndex, 
      totalChunks, 
      filename 
    } = req.headers;

    if (!uploadId || !chunkIndex || !totalChunks || !filename) {
      return res.status(400).json({ error: 'Missing required headers' });
    }

    const tempDir = path.join(__dirname, 'temp', uploadId);
    await fs.mkdir(tempDir, { recursive: true });

    const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
    await fs.writeFile(chunkPath, req.body);

    let uploadInfo = chunkedUploads.get(uploadId) || {
      chunks: new Set(),
      filename: filename,
      totalChunks: parseInt(totalChunks)
    };
    
    uploadInfo.chunks.add(parseInt(chunkIndex));
    chunkedUploads.set(uploadId, uploadInfo);

    if (uploadInfo.chunks.size === uploadInfo.totalChunks) {
      const finalPath = path.join(__dirname, 'uploads', `${Date.now()}-${filename}`);
      const writeStream = require('fs').createWriteStream(finalPath);

      for (let i = 0; i < uploadInfo.totalChunks; i++) {
        const chunkData = await fs.readFile(path.join(tempDir, `chunk-${i}`));
        writeStream.write(chunkData);
      }

      writeStream.end();

      await new Promise((resolve) => writeStream.on('finish', resolve));

      await fs.rm(tempDir, { recursive: true });
      chunkedUploads.delete(uploadId);

      res.json({
        success: true,
        complete: true,
        file: {
          filename: filename,
          path: finalPath
        }
      });
    } else {
      res.json({
        success: true,
        complete: false,
        chunksReceived: uploadInfo.chunks.size,
        totalChunks: uploadInfo.totalChunks
      });
    }
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Chunk upload failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', maxFileSize: '5GB' });
});

const startServer = async () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  await ensureDirectoryExists(uploadsDir);

  setInterval(async () => {
    await cleanupOldFiles(uploadsDir, 7);
  }, 24 * 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('- POST /upload - Standard file upload (up to 5GB)');
    console.log('- POST /upload/chunk - Chunked file upload for very large files');
    console.log('- GET /health - Server health check');
  });
};

startServer().catch(console.error);