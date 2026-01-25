// app/api/chat-suggest/route.js
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

    const { rma, messages } = await request.json();

    if (!rma) {
      return NextResponse.json({ error: 'Missing RMA data' }, { status: 400 });
    }

    // Build context about the RMA
    const rmaContext = `
RMA Information:
- RMA Number: ${rma.request_number}
- Status: ${rma.status}
- Service Requested: ${rma.requested_service}
- Company: ${rma.company_name}
- Devices: ${rma.devices?.map(d => `${d.model} (SN: ${d.serial}) - Status: ${d.status || 'pending'}, Service: ${d.service_type}`).join('; ') || 'No devices listed'}
`;

    // Build conversation history
    const conversationHistory = messages?.length > 0 
      ? `\nRecent Conversation:\n${messages.map(m => `[${m.sender === 'admin' ? 'Admin' : 'Customer'}]: ${m.content}`).join('\n')}`
      : '\nNo previous messages in this conversation.';

    const systemPrompt = `You are a helpful customer service assistant for Lighthouse France, a calibration and repair service company for particle counters and bio collectors.

Your task is to suggest a professional, helpful response to the customer based on the RMA (Return Merchandise Authorization) context and conversation history.

Guidelines:
1. Be polite and professional
2. Address the customer's concerns based on the conversation
3. Provide relevant status updates based on the RMA data
4. If the device is in calibration/repair, give an estimated timeline if appropriate
5. If documents are needed (like BC - Bon de Commande), remind them politely
6. Keep responses concise but complete

You must provide your response in BOTH French and English.

Format your response as JSON:
{
  "french": "Your suggested response in French",
  "english": "The same response in English"
}

Only respond with the JSON, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${rmaContext}${conversationHistory}\n\nPlease suggest an appropriate response to send to the customer.`
        }
      ],
      system: systemPrompt
    });

    const responseText = message.content[0].text;
    
    // Parse the JSON response
    let suggestion;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      suggestion = {
        french: responseText,
        english: 'Translation not available'
      };
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json({ error: 'AI suggestion failed: ' + error.message }, { status: 500 });
  }
}
