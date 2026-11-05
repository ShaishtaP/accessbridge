import Evidence from '../models/Evidence.js';
import { findIssue } from './issueController.js';
import { screenshotFieldsSchema } from '../schemas/evidenceSchemas.js';
import { hasImageSignature, removeFile, storedFilePath } from '../config/uploads.js';
import { httpError } from '../utils/httpError.js';
import { loadForMember } from '../utils/workspaceAccess.js';
import { recordActivity } from '../utils/activity.js';

// Runs before multer, so files are only written for members of the workspace that owns the issue.
export async function loadIssue(req, res, next) {
  const { workspace } = await loadForMember(req);
  req.workspace = workspace;
  req.issue = await findIssue(workspace, req.params.issueId);
  next();
}

function newEvidence(req, fields) {
  return { workspace: req.workspace._id, issue: req.issue._id, createdBy: req.user._id, ...fields };
}

function recordEvidence(req, evidence) {
  return recordActivity({
    workspace: req.workspace._id,
    issue: req.issue._id,
    actor: req.user._id,
    action: 'evidence.added',
    meta: { evidenceId: evidence._id.toString(), kind: evidence.kind, phase: evidence.phase },
  });
}

// Oldest first, so the original finding always appears before later evidence.
export async function listEvidence(req, res) {
  const items = await Evidence.find({ issue: req.issue._id }).sort({ createdAt: 1 });
  res.json({ evidence: items.map((e) => e.toPublic()) });
}

export async function addKeyboardNote(req, res) {
  const { note, phase } = req.body;
  const evidence = await Evidence.create(newEvidence(req, { kind: 'keyboard_note', note, phase }));
  await recordEvidence(req, evidence);
  res.status(201).json({ evidence: evidence.toPublic() });
}

export async function addScreenshot(req, res) {
  if (!req.file) throw httpError(400, 'Attach an image in the "file" field');

  const fields = screenshotFieldsSchema.safeParse(req.body ?? {});
  const validImage = await hasImageSignature(req.file.path);
  if (!fields.success || !validImage) {
    // Nothing is saved, so don't keep the file either.
    await removeFile(req.file.path);
    if (!validImage) throw httpError(415, 'File content is not a PNG, JPEG or WebP image');
    const details = fields.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw httpError(400, 'Validation failed', details);
  }

  const { caption, phase } = fields.data;
  const evidence = await Evidence.create(
    newEvidence(req, {
      kind: 'screenshot',
      note: caption,
      phase,
      file: {
        storedName: req.file.filename,
        originalName: req.file.originalname.slice(0, 200),
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    })
  );
  await recordEvidence(req, evidence);
  res.status(201).json({ evidence: evidence.toPublic() });
}

// Streams a screenshot to workspace members only; files are never served as public static assets.
export async function downloadFile(req, res) {
  const evidence = await Evidence.findOne({ _id: req.params.evidenceId, issue: req.issue._id });
  if (!evidence?.file) throw httpError(404, 'File not found');

  res.sendFile(storedFilePath(req.workspace._id, evidence.file.storedName), {
    headers: {
      'Content-Type': evidence.file.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
