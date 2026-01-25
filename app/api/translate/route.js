// app/api/translate/route.js
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Check for API key
  if (!process.env.CLAUDE_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    const { text, direction } = await request.json();

    if (!text || !direction) {
      return NextResponse.json({ error: 'Missing text or direction' }, { status: 400 });
    }

    let systemPrompt;
    if (direction === 'en-to-fr') {
      systemPrompt = `You are a professional translator. Translate the following English text to French. 
Keep the tone professional but friendly, appropriate for business communication with customers.
Only respond with the translation, nothing else.`;
    } else if (direction === 'fr-to-en') {
      systemPrompt = `You are a professional translator. Translate the following French text to English.
Keep the translation natural and easy to understand.
Only respond with the translation, nothing else.`;
    } else {
      return NextResponse.json({ error: 'Invalid direction. Use "en-to-fr" or "fr-to-en"' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: text
        }
      ],
      system: systemPrompt
    });

    const translation = message.content[0].text;

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed: ' + error.message }, { status: 500 });
  }
}
