import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Validate API Key ───────────────────────────────────────────────────────────
if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is missing from environment variables!');
    process.exit(1);
}
console.log('✅ Groq API key loaded');

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

// Per-session data: { systemPrompt, messages[] }
const sessions = {};

// ── System Prompt Builder ──────────────────────────────────────────────────────
function buildSystemPrompt(topic, difficulty) {
    return `You are a world-class, sharp, and demanding interviewer conducting a mock ${difficulty || 'intermediate'}-level interview for: ${topic}.

RULES:
- Ask EXACTLY ONE focused question to begin. Do NOT ask multiple questions at once.
- After the candidate answers, give a concise evaluation (2–3 sentences max): what was good, what was missing or weak.
- Then immediately ask the next question. Stay in character at all times.
- Vary question types: conceptual, situational, technical deep-dives, case studies, behavioral.
- Escalate difficulty gradually based on the candidate's responses.
- Be direct, professional, and use industry-standard terminology.
- Do NOT offer hints unless specifically asked.
- Format your evaluations clearly starting with "Evaluation:" on a new line.`;
}

// ── Start Interview ────────────────────────────────────────────────────────────
app.post('/api/start-interview', async (req, res) => {
    const { topic, difficulty, sessionId } = req.body;

    if (!topic || !sessionId) {
        return res.status(400).json({ error: 'Missing topic or sessionId.' });
    }

    // Store system prompt + empty message history
    sessions[sessionId] = {
        systemPrompt: buildSystemPrompt(topic, difficulty),
        messages: [],
    };

    try {
        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: sessions[sessionId].systemPrompt },
            ],
            max_tokens: 512,
            temperature: 0.8,
        });

        const reply = response.choices[0].message.content;

        // Store the opening question in history
        sessions[sessionId].messages.push({ role: 'assistant', content: reply });

        res.json({ reply });
    } catch (error) {
        console.error('Error starting interview:', error.message);
        res.status(500).json({ error: 'Failed to start interview. Check your OpenAI API key and quota.' });
    }
});

// ── Streaming Chat ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!sessions[sessionId]) {
        return res.status(400).json({ error: 'Session not found. Please start the interview again.' });
    }

    // Add user message to history
    sessions[sessionId].messages.push({ role: 'user', content: message });

    // Build full messages array: system + all history
    const messagesForAPI = [
        { role: 'system', content: sessions[sessionId].systemPrompt },
        ...sessions[sessionId].messages,
    ];

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Keepalive ping every 15s so Render doesn't drop the connection
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);

    let fullReply = '';

    try {
        const stream = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messagesForAPI,
            max_tokens: 512,
            temperature: 0.8,
            stream: true,
        });

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
                fullReply += text;
                res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
            }
        }

        // Save assistant reply to session history
        sessions[sessionId].messages.push({ role: 'assistant', content: fullReply });

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
        console.error('Error generating response:', error.message);
        res.write(`data: ${JSON.stringify({ error: 'Failed to generate response.' })}\n\n`);
    } finally {
        clearInterval(keepAlive);
        res.end();
    }
});

// ── End Interview + Summary ────────────────────────────────────────────────────
app.post('/api/end-interview', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessions[sessionId] || sessions[sessionId].messages.length < 2) {
        return res.json({ summary: 'Interview was too short to generate a meaningful summary.' });
    }

    const summaryPrompt = `Based on our interview conversation so far, provide a structured performance report:

1. **Overall Score**: X/10 with a one-line verdict
2. **Strengths**: 2–3 bullet points on what the candidate did well
3. **Areas to Improve**: 2–3 bullet points on weaknesses or gaps
4. **Topic Mastery**: Brief assessment of domain knowledge depth
5. **Next Steps**: 2 specific resources or actions to improve

Be honest, specific, and constructive. This is for a serious job-seeker.`;

    const messagesForSummary = [
        { role: 'system', content: sessions[sessionId].systemPrompt },
        ...sessions[sessionId].messages,
        { role: 'user', content: summaryPrompt },
    ];

    try {
        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messagesForSummary,
            max_tokens: 700,
            temperature: 0.5,
        });

        const summary = response.choices[0].message.content;

        // Clean up session
        delete sessions[sessionId];

        res.json({ summary });
    } catch (error) {
        console.error('Error generating summary:', error.message);
        res.status(500).json({ error: 'Failed to generate summary.' });
    }
});

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', sessions: Object.keys(sessions).length });
});

app.listen(port, () => {
    console.log(`🚀 InterviewForge running at: http://localhost:${port}`);
});