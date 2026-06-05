import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Per-session chat histories stored by sessionId
const sessions = {};

// ── Start Interview ────────────────────────────────────────────────────────────
app.post('/api/start-interview', async (req, res) => {
    const { topic, difficulty, sessionId } = req.body;

    const systemInstruction = `You are a world-class, sharp, and demanding interviewer conducting a mock ${difficulty || 'intermediate'}-level interview for: ${topic}.

RULES:
- Ask EXACTLY ONE focused question to begin. Do NOT ask multiple questions at once.
- After the candidate answers, give a concise evaluation (2–3 sentences max): what was good, what was missing or weak.
- Then immediately ask the next question. Stay in character at all times.
- Vary question types: conceptual, situational, technical deep-dives, case studies, behavioral.
- Escalate difficulty gradually based on the candidate's responses.
- Be direct, professional, and use industry-standard terminology.
- Do NOT offer hints unless specifically asked.
- Format your evaluations clearly starting with "Evaluation:" on a new line.`;

    sessions[sessionId] = [{ role: 'user', parts: [{ text: systemInstruction }] }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: sessions[sessionId],
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 512,
            }
        });

        const reply = response.text;
        sessions[sessionId].push({ role: 'model', parts: [{ text: reply }] });

        res.json({ reply });
    } catch (error) {
        console.error("Error starting interview:", error);
        res.status(500).json({ error: "Failed to start interview." });
    }
});

// ── Streaming Chat ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!sessions[sessionId]) {
        return res.status(400).json({ error: "Session not found. Please start the interview again." });
    }

    sessions[sessionId].push({ role: 'user', parts: [{ text: message }] });

    // Use SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const streamResult = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: sessions[sessionId],
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 512,
            }
        });

        let fullReply = '';

        for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullReply += chunkText;
                res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
            }
        }

        sessions[sessionId].push({ role: 'model', parts: [{ text: fullReply }] });

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (error) {
        console.error("Error generating response:", error);
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response." })}\n\n`);
        res.end();
    }
});

// ── End session ────────────────────────────────────────────────────────────────
app.post('/api/end-interview', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessions[sessionId] || sessions[sessionId].length < 3) {
        return res.json({ summary: "Interview was too short to generate a summary." });
    }

    const summaryPrompt = `Based on our interview conversation, provide a structured performance report with:
1. **Overall Score**: X/10 with a one-line verdict
2. **Strengths**: 2–3 bullet points on what the candidate did well
3. **Areas to Improve**: 2–3 bullet points on weaknesses or gaps
4. **Topic Mastery**: Brief assessment of domain knowledge depth
5. **Next Steps**: 2 specific resources or actions to improve

Be honest, specific, and constructive. This is for a serious job-seeker.`;

    const summaryHistory = [
        ...sessions[sessionId],
        { role: 'user', parts: [{ text: summaryPrompt }] }
    ];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: summaryHistory,
            generationConfig: { temperature: 0.5, maxOutputTokens: 700 }
        });

        delete sessions[sessionId];
        res.json({ summary: response.text });
    } catch (error) {
        console.error("Error generating summary:", error);
        res.status(500).json({ error: "Failed to generate summary." });
    }
});

app.listen(port, () => {
    console.log(`🚀 AI Interview App running at: http://localhost:${port}`);
});