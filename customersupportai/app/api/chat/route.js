import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Replace with your actual OpenAI API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this environment variable is set
});

// System prompt for the AI
const systemPrompt = "You are a helpful assistant.";

export async function POST(req) {
  try {
    const data = await req.json();
    const userMessage = data[data.length - 1].content;
    const language = detectLanguage(userMessage); // Function to detect language

    // Adjust the system prompt based on the detected language
    const languagePrompts = {
      'fr': 'Vous êtes un assistant utile.',
      'es': 'Eres un asistente útil.',
      'de': 'Sie sind ein hilfreicher Assistent.',
      'default': systemPrompt,
    };

    const adjustedSystemPrompt = languagePrompts[language] || languagePrompts['default'];

    // Create a chat completion request to OpenAI API
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: adjustedSystemPrompt }, ...data],
      model: 'gpt-4o', // Update model if necessary
      stream: true,
    });

    // Handle streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const text = encoder.encode(content);
              controller.enqueue(text);
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error('Error processing request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Simple language detection based on common phrases
function detectLanguage(text) {
  if (text.includes('Bonjour')) return 'fr';
  if (text.includes('Hola')) return 'es';
  if (text.includes('Hallo')) return 'de';
  return 'en'; // Default to English
}
