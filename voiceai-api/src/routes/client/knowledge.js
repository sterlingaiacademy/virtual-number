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
    const agentResult = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [req.user.client_id]
    );

    if (agentResult.rows.length === 0 || !agentResult.rows[0].elevenlabs_agent_id) {
       return res.json({ documents: [] });
    }

    const agentId = agentResult.rows[0].elevenlabs_agent_id;
    const agent = await elevenLabsService.getAgent(agentId);

    const kb = agent.conversation_config?.agent?.prompt?.knowledge_base || [];

    const documents = kb.map(doc => ({
      id: doc.id,
      name: doc.name,
      mime_type: doc.type === 'file' ? 'application/pdf' : 'text/plain',
      type: doc.type,
      created_at: new Date().toISOString()
    }));

    res.json({ documents });
  } catch (err) {
    console.error('Failed to fetch KB from ElevenLabs:', err);
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
      process.env.GCS_BUCKET || 'voiceai-recordings',
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
      elevenLabsService.uploadKnowledgeBaseFile(agentId, req.file.buffer, req.file.originalname, req.file.mimetype)
        .then(async (result) => {
          const kbId = result.id || result;
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

// POST /api/client/knowledge/text
router.post('/text', async (req, res, next) => {
  try {
    const { name, text } = req.body;
    if (!name || !text) return res.status(400).json({ error: 'Name and text are required' });

    const clientId = req.user.client_id;
    const gcsPath = `knowledge/${clientId}/${Date.now()}_${name}.txt`;

    // Upload text as a file to GCS
    await storageService.uploadBuffer(
      process.env.GCS_BUCKET || 'voiceai-recordings',
      gcsPath,
      Buffer.from(text, 'utf-8'),
      'text/plain'
    );

    const docResult = await db.query(
      `INSERT INTO knowledge_documents (client_id, file_name, file_size, gcs_path, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING *`,
      [clientId, `${name}.txt`, Buffer.byteLength(text, 'utf8'), gcsPath]
    );
    const doc = docResult.rows[0];

    const agentResult = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [clientId]
    );

    if (agentResult.rows.length > 0) {
      const agentId = agentResult.rows[0].elevenlabs_agent_id;
      elevenLabsService.uploadKnowledgeBaseFile(agentId, Buffer.from(text, 'utf-8'), `${name}.txt`, 'text/plain')
        .then(async (result) => {
          const kbId = result.id || result;
          await db.query(
            "UPDATE knowledge_documents SET elevenlabs_kb_id = $1, status = 'ready' WHERE id = $2",
            [kbId, doc.id]
          );
        })
        .catch(async (err) => {
          console.error('ElevenLabs KB text upload failed:', err.message);
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

// POST /api/client/knowledge/url
router.post('/url', async (req, res, next) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and url are required' });

    const clientId = req.user.client_id;
    
    // Insert into DB with null gcs_path
    const docResult = await db.query(
      `INSERT INTO knowledge_documents (client_id, file_name, url, status)
       VALUES ($1, $2, $3, 'processing') RETURNING *`,
      [clientId, name, url]
    );
    const doc = docResult.rows[0];

    const agentResult = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [clientId]
    );

    if (agentResult.rows.length > 0) {
      const agentId = agentResult.rows[0].elevenlabs_agent_id;
      elevenLabsService.createKnowledgeBaseUrl(agentId, { name, url })
        .then(async (result) => {
          const kbId = result.id || result;
          await db.query(
            "UPDATE knowledge_documents SET elevenlabs_kb_id = $1, status = 'ready' WHERE id = $2",
            [kbId, doc.id]
          );
        })
        .catch(async (err) => {
          console.error('ElevenLabs KB url upload failed:', err.message);
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

// GET /api/client/knowledge/:id/content
router.get('/:id/content', async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.user.client_id;

    // Find the document in our DB using the ElevenLabs KB ID
    const result = await db.query(
      'SELECT * FROM knowledge_documents WHERE elevenlabs_kb_id = $1 AND client_id = $2',
      [id, clientId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found locally' });
    const doc = result.rows[0];

    if (!doc.gcs_path) return res.status(400).json({ error: 'Document has no text content stored locally' });

    // Read from GCS
    const buffer = await storageService.downloadBuffer(process.env.GCS_BUCKET || 'voiceai-recordings', doc.gcs_path);
    res.json({ text: buffer.toString('utf-8') });
  } catch (err) {
    next(err);
  }
});

// PUT /api/client/knowledge/:id/text
router.put('/:id/text', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, text } = req.body;
    const clientId = req.user.client_id;

    const result = await db.query(
      'SELECT * FROM knowledge_documents WHERE elevenlabs_kb_id = $1 AND client_id = $2',
      [id, clientId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found locally' });
    const doc = result.rows[0];

    // Delete old document from ElevenLabs
    const agentResult = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [clientId]
    );

    if (agentResult.rows.length > 0) {
      const agentId = agentResult.rows[0].elevenlabs_agent_id;
      
      try {
        await elevenLabsService.deleteKnowledgeBaseDoc(agentId, id);
      } catch (e) {
        console.warn('ElevenLabs KB old doc deletion failed:', e.message);
      }

      // Create new document
      const baseName = name || doc.file_name.replace('.txt', '');
      const fileName = baseName.endsWith('.txt') ? baseName : `${baseName}.txt`;
      const newResult = await elevenLabsService.uploadKnowledgeBaseFile(agentId, Buffer.from(text, 'utf-8'), fileName, 'text/plain');
      const newKbId = newResult.id || newResult;

      // Overwrite GCS file
      if (doc.gcs_path) {
        await storageService.uploadBuffer(
          process.env.GCS_BUCKET || 'voiceai-recordings',
          doc.gcs_path,
          Buffer.from(text, 'utf-8'),
          'text/plain'
        );
      }

      // Update DB with new kb_id
      await db.query(
        "UPDATE knowledge_documents SET elevenlabs_kb_id = $1 WHERE id = $2",
        [newKbId, doc.id]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/client/knowledge/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const agentResult = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [req.user.client_id]
    );
    
    if (agentResult.rows.length > 0 && agentResult.rows[0].elevenlabs_agent_id) {
      try {
        await elevenLabsService.deleteKnowledgeBaseDoc(agentResult.rows[0].elevenlabs_agent_id, req.params.id);
      } catch (e) {
        console.warn('ElevenLabs KB deletion failed (non-fatal):', e.message);
      }
    }

    const result = await db.query(
      'SELECT * FROM knowledge_documents WHERE (id::text = $1 OR elevenlabs_kb_id = $1) AND client_id = $2',
      [req.params.id, req.user.client_id]
    );

    if (result.rows.length > 0) {
      const doc = result.rows[0];
      try {
        await storageService.deleteFileFromBucket(process.env.GCS_BUCKET || 'voiceai-recordings', doc.gcs_path);
      } catch (e) {
        console.warn('GCS deletion failed (non-fatal):', e.message);
      }
      await db.query('DELETE FROM knowledge_documents WHERE id = $1', [doc.id]);
    }

    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
