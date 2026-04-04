import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/analyze-page', async (req, res) => {
  const { image, language } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  // Strip data URL prefix if present
  let base64Image = image;
  let mediaType = 'image/jpeg';

  if (image.startsWith('data:')) {
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mediaType = matches[1];
      base64Image = matches[2];
    }
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
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent) {
      return res.status(500).json({ error: 'No text response from AI' });
    }

    let parsed;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(textContent.text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return res.status(500).json({ error: 'Failed to parse AI response', raw: textContent.text });
    }

    if (!parsed.highlights || !Array.isArray(parsed.highlights)) {
      parsed = { highlights: [] };
    }

    return res.json(parsed);
  } catch (error) {
    console.error('Anthropic API error:', error);
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    return res.status(500).json({ error: error.message || 'Failed to analyze image' });
  }
});

app.listen(PORT, () => {
  console.log(`BookMarks backend running on http://localhost:${PORT}`);
  console.log(`API key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No - set ANTHROPIC_API_KEY in .env'}`);
});
