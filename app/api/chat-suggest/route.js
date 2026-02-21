// app/api/chat-suggest/route.js
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request) {
  if (!process.env.CLAUDE_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    const { rma, messages } = await request.json();

    if (!rma) {
      return NextResponse.json({ error: 'Missing context data' }, { status: 400 });
    }

    // Detect conversation type from frontend data
    const convoType = rma.type || 'rma';

    // Build context based on conversation type
    let contextBlock = '';
    let typeLabel = '';
    let guidelines = '';

    if (convoType === 'rental') {
      typeLabel = 'Location / Rental';
      contextBlock = `
Rental Request Information:
- Rental Number: ${rma.request_number}
- Status: ${rma.status}
- Company: ${rma.company_name}
- Equipment: ${rma.items?.map(d => `${d.model}${d.serial ? ` (SN: ${d.serial})` : ''}${d.status ? ` - ${d.status}` : ''}`).join('; ') || 'No equipment listed'}
`;
      guidelines = `
Rental-specific guidelines:
1. Address availability of requested equipment
2. Confirm rental period dates if discussed
3. Mention delivery/pickup logistics if relevant
4. If a Bon de Commande (BC/purchase order) is needed, remind politely
5. Mention rental pricing or quote if appropriate
6. For returns, confirm condition expectations and pickup scheduling`;

    } else if (convoType === 'parts_order') {
      typeLabel = 'Commande Pièces Détachées / Parts Order';
      contextBlock = `
Parts Order Information:
- Order Number: ${rma.request_number}
- Status: ${rma.status}
- Company: ${rma.company_name}
- Items: ${rma.items?.map(d => `${d.model}${d.serial ? ` (SN: ${d.serial})` : ''}${d.status ? ` - ${d.status}` : ''}`).join('; ') || 'No items listed'}
`;
      guidelines = `
Parts Order-specific guidelines:
1. Address parts availability and lead times
2. Confirm pricing or reference the quote (devis) if sent
3. If a Bon de Commande (BC/purchase order) is needed before shipping, remind politely
4. Provide estimated delivery timeline if known
5. Mention shipping method if relevant
6. For backordered items, give realistic timelines and offer alternatives if possible`;

    } else if (convoType === 'contract') {
      typeLabel = 'Contrat de Service / Service Contract';
      contextBlock = `
Contract Information:
- Contract Number: ${rma.request_number}
- Status: ${rma.status}
- Company: ${rma.company_name}
- Service: ${rma.requested_service || 'Annual calibration contract'}
- Equipment: ${(rma.devices || rma.items)?.map(d => `${d.model}${d.serial ? ` (SN: ${d.serial})` : ''}`).join('; ') || 'No equipment listed'}
`;
      guidelines = `
Contract-specific guidelines:
1. Address contract renewal or scheduling questions
2. Mention upcoming calibration dates if relevant
3. Confirm pricing and terms from the contract
4. Coordinate equipment pickup/delivery for scheduled calibrations
5. Remind about contract benefits (priority service, fixed pricing, etc.)
6. For expired contracts, suggest renewal options`;

    } else {
      // Default: RMA
      typeLabel = 'RMA / Service Request';
      contextBlock = `
RMA Information:
- RMA Number: ${rma.request_number}
- Status: ${rma.status}
- Service Requested: ${rma.requested_service}
- Company: ${rma.company_name}
- Devices: ${rma.devices?.map(d => `${d.model} (SN: ${d.serial}) - Status: ${d.status || 'pending'}${d.service_type ? `, Service: ${d.service_type}` : ''}`).join('; ') || 'No devices listed'}
`;
      guidelines = `
RMA-specific guidelines:
1. Provide relevant status updates based on the RMA data
2. If the device is in calibration/repair, give an estimated timeline if appropriate
3. If a Bon de Commande (BC/purchase order) or quote approval is needed, remind politely
4. Address any technical questions about particle counters or bio collectors
5. Mention shipping/return logistics if relevant
6. Reference the quote (devis) if one has been sent`;
    }

    // Build conversation history
    const conversationHistory = messages?.length > 0 
      ? `\nRecent Conversation:\n${messages.map(m => `[${m.sender === 'admin' ? 'Admin' : 'Customer'}]: ${m.content}`).join('\n')}`
      : '\nNo previous messages in this conversation.';

    const systemPrompt = `You are a helpful customer service assistant for Lighthouse France, a calibration, repair, and rental service company for particle counters and bio collectors based in Créteil, France.

You are responding in the context of a ${typeLabel} conversation.

Your task is to suggest a professional, helpful response to the customer based on the context and conversation history.

General guidelines:
1. Be polite and professional — use "vous" (formal French)
2. Address the customer's concerns based on the conversation
3. Keep responses concise but complete (2-4 sentences typically)
4. Sign off naturally without adding a signature (the system adds it automatically)
5. Match the tone of the conversation — if the customer is casual, be warm; if formal, stay formal
${guidelines}

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
          content: `${contextBlock}${conversationHistory}\n\nPlease suggest an appropriate response to send to the customer.`
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
