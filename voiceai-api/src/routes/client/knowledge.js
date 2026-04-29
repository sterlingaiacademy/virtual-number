const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../../config/database');
const { storageService } = require('../../services/storageService');
const { elevenLabsService } = require('../../services/elevenLabsService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and Word documents are allowed'));
    }
  },
});

// GET /api/client/knowledge
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM knowledge_documents WHERE client_id = $1 ORDER BY created_at DESC',
      [req.user.client_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/client/knowledge/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const clientId = req.user.client_id;
    const gcsPath = `knowledge/${clientId}/${Date.now()}_${req.file.originalname}`;

    // Upload to GCS
    await storageService.uploadBuffer(
      process.env.GCS_KNOWLEDGE_BUCKET,
      gcsPath,
      req.file.buffer,
      req.file.mimetype
    );

    // Save initial record
    const docResult = await db.query(
      `INSERT INTO knowledge_documents (client_id, file_name, file_size, gcs_path, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING *`,
      [clientId, req.file.originalname, req.file.size, gcsPath]
    );
    const doc = docResult.rows[0];

    // Get agent to upload to ElevenLabs KB (async)
    const agentResult = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [clientId]
    );

    if (agentResult.rows.length > 0) {
      const agentId = agentResult.rows[0].elevenlabs_agent_id;
      elevenLabsService.uploadKnowledgeDoc(agentId, req.file.buffer, req.file.originalname, req.file.mimetype)
        .then(async (kbId) => {
          await db.query(
            "UPDATE knowledge_documents SET elevenlabs_kb_id = $1, status = 'ready' WHERE id = $2",
            [kbId, doc.id]
          );
        })
        .catch(async (err) => {
          console.error('ElevenLabs KB upload failed:', err.message);
          await db.query(
            "UPDATE knowledge_documents SET status = 'failed' WHERE id = $1",
            [doc.id]
          );
        });
    }

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/client/knowledge/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM knowledge_documents WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    const doc = result.rows[0];
    // Delete from GCS
    try {
      await storageService.deleteFile(process.env.GCS_KNOWLEDGE_BUCKET, doc.gcs_path);
    } catch (e) {
      console.warn('GCS deletion failed (non-fatal):', e.message);
    }

    await db.query('DELETE FROM knowledge_documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
