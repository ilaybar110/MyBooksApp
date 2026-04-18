import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import cron from 'node-cron';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}
const app = express();
const PORT = process.env.PORT || 3001;

// Data file — stored in backend/data/db.json
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');

const DEFAULT_DATA = {
  version: 1,
  books: [],
  highlights: [],
  tags: [],
  settings: { defaultLanguage: 'en', sortOrder: 'dateAdded' },
  pushSubscriptions: [],
};

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
      return { ...DEFAULT_DATA };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to read data:', e);
    return { ...DEFAULT_DATA };
  }
}

function writeData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function sendDailyPush() {
  const data = readData();
  const subs = data.pushSubscriptions || [];
  if (!subs.length) return;

  const payload = JSON.stringify({
    title: '📖 Highlights of the Day',
    body: "Tap to see today's quotes",
  });

  const failed = [];
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        failed.push(sub.endpoint);
      } else {
        console.error('Push send error:', e.message);
      }
    }
  }));

  if (failed.length) {
    data.pushSubscriptions = subs.filter(s => !failed.includes(s.endpoint));
    writeData(data);
    console.log(`Removed ${failed.length} expired push subscription(s)`);
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve built frontend
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// ── Data API ──────────────────────────────────────────────

app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.post('/api/data', (req, res) => {
  try {
    writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Push Notifications ────────────────────────────────────

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

app.post('/api/push/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    const data = readData();
    if (!data.pushSubscriptions) data.pushSubscriptions = [];
    const exists = data.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      data.pushSubscriptions.push(subscription);
      writeData(data);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/push/test', async (req, res) => {
  try {
    await sendDailyPush();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI Analysis ───────────────────────────────────────────

app.post('/api/analyze-page', async (req, res) => {
  const { image, language } = req.body;

  if (!image) return res.status(400).json({ error: 'Image is required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });

  let base64Image = image;
  let mediaType = 'image/jpeg';
  if (image.startsWith('data:')) {
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) { mediaType = matches[1]; base64Image = matches[2]; }
  }

  const isHebrew = language === 'he';
  const prompt = `You are analyzing a photograph of a book page. The user has marked certain sentences using a pencil to draw a vertical line or bracket along the RIGHT margin of the text — beside the lines they want to highlight. ${isHebrew ? 'This is a Hebrew book — text reads right to left, so the RIGHT side of the page is where each line begins, and the pencil marks appear in the RIGHT margin next to the marked text.' : 'Look for pencil marks in the right margin next to lines of text.'}

IMPORTANT:
- The marks are PENCIL LINES or BRACKETS drawn vertically in the margin on the RIGHT side of the text block.
- Do NOT look for underlines beneath the text.
- Do NOT look for highlighting or color marks.
- Do NOT look for marks on the left side.
- The pencil line runs vertically beside one or more lines of text on the RIGHT, indicating those lines are the quote.

Your task:
1. Identify ALL text that has a pencil mark in the RIGHT margin beside it
2. For each marked section, extract:
   - "markedText": The exact sentence(s) beside the pencil mark, transcribed precisely
   - "fullContext": The full paragraph containing the marked text
   - "pageNumber": The page number if visible on the page, otherwise null

Language: The text is in ${isHebrew ? 'Hebrew' : 'English'}. Preserve the original language exactly.

Return ONLY valid JSON in this exact format, no other text:
{
  "highlights": [
    {
      "markedText": "...",
      "fullContext": "...",
      "pageNumber": null
    }
  ]
}

If no right-margin pencil marks are detected, return: {"highlights": []}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: prompt },
      ]}],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent) return res.status(500).json({ error: 'No text response from AI' });

    let parsed;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textContent.text);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (!parsed.highlights || !Array.isArray(parsed.highlights)) parsed = { highlights: [] };
    return res.json(parsed);
  } catch (error) {
    console.error('Anthropic API error:', error);
    if (error.status === 401) return res.status(401).json({ error: 'Invalid API key' });
    if (error.status === 429) return res.status(429).json({ error: 'Rate limit exceeded.' });
    return res.status(500).json({ error: error.message || 'Failed to analyze image' });
  }
});

// Fallback — serve frontend for all non-API routes
if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Daily push notification at 10:00 AM server time
cron.schedule('0 10 * * *', () => {
  console.log('Sending daily push notifications...');
  sendDailyPush().catch(e => console.error('Daily push failed:', e));
});

app.listen(PORT, () => {
  console.log(`BookMarks running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`AI key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`Push: ${process.env.VAPID_PUBLIC_KEY ? 'configured' : 'NOT SET — add VAPID keys to .env'}`);
});
