# File Upload Server

A robust Node.js server for handling large file uploads with support for chunked uploads.

## Features

- Standard file upload (up to 5GB)
- Chunked upload for very large files
- File validation and sanitization
- Automatic cleanup of old files (7 days)
- CORS enabled for cross-origin requests
- Progress tracking on client side

## Installation

```bash
npm install
```

## Running the Server

```bash
# Production mode
npm start

# Development mode with auto-restart
npm run dev
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### POST /upload
Standard file upload endpoint for files up to 5GB.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file field with the file to upload

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "uploaded-filename.ext",
    "originalName": "original-filename.ext",
    "size": 1024,
    "path": "/full/path/to/file"
  }
}
```

### POST /upload/chunk
Chunked upload endpoint for very large files.

**Request Headers:**
- uploadId: Unique identifier for the upload session
- chunkIndex: Current chunk index (0-based)
- totalChunks: Total number of chunks
- filename: Original filename

**Response:**
```json
{
  "success": true,
  "complete": false,
  "chunksReceived": 1,
  "totalChunks": 10
}
```

When all chunks are received:
```json
{
  "success": true,
  "complete": true,
  "file": {
    "filename": "filename.ext",
    "path": "/full/path/to/file"
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "maxFileSize": "5GB"
}
```

## Client Example

Open `client-example.html` in a browser to test the upload functionality. The example includes:
- File selection with info display
- Standard upload for regular files
- Chunked upload for large files
- Progress tracking
- Error handling

## Configuration

### Allowed File Types
The server accepts the following file extensions:
- Images: .jpg, .jpeg, .png, .gif, .bmp, .webp
- Documents: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx
- Text: .txt, .csv, .json, .xml
- Archives: .zip, .rar, .7z, .tar, .gz
- Media: .mp3, .mp4, .avi, .mov, .wmv
- Code: .js, .ts, .py, .java, .cpp, .c, .html, .css

### Environment Variables
- `PORT`: Server port (default: 3000)

## Security Features

- File type validation
- Filename sanitization
- Size limits (5GB max)
- Automatic cleanup of old files
- Invalid character filtering

## Error Handling

The server includes comprehensive error handling for:
- Missing files
- Invalid file types
- Oversized files
- Upload failures
- Chunk assembly errors

## Notes

- Uploaded files are stored in the `uploads` directory
- Temporary chunks are stored in the `temp` directory
- Files older than 7 days are automatically deleted
- CORS is enabled for all origins (configure for production use)