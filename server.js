import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_if_missing');

// Memory logic
const MEMORY_FILE = path.join(__dirname, 'memories.json');

// Helper to initialize memory file
function initMemory() {
    if (!fs.existsSync(MEMORY_FILE)) {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify([]));
    }
}
initMemory();

// Cosine Similarity calculator
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Store Memory Endpoint
app.post('/api/memory', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;

        const memories = JSON.parse(fs.readFileSync(MEMORY_FILE));
        
        const newMemory = {
            id: Date.now().toString(),
            text,
            embedding,
            timestamp: new Date().toISOString()
        };
        
        memories.push(newMemory);
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));

        res.json({ success: true, message: 'Memory stored successfully.', id: newMemory.id });
    } catch (error) {
        console.error("Error storing memory:", error);
        res.status(500).json({ error: 'Failed to store memory.', details: error.message });
    }
});

// Chat/Retrieve Endpoint using RAG
app.post('/api/chat', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // 1. Convert query to embedding
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embedModel.embedContent(query);
        const queryEmbedding = embedResult.embedding.values;

        // 2. Search local Vector DB
        const memories = JSON.parse(fs.readFileSync(MEMORY_FILE));
        
        const scoredMemories = memories.map(mem => {
            return {
                text: mem.text,
                score: cosineSimilarity(queryEmbedding, mem.embedding),
                timestamp: mem.timestamp
            };
        });

        // Sort desc, take top 5
        scoredMemories.sort((a, b) => b.score - a.score);
        const topMemories = scoredMemories.slice(0, 5).filter(m => m.score > 0.5); // Optional threshold

        // 3. Construct System Prompt
        const contextText = topMemories.map(m => `- [${m.timestamp}] ${m.text}`).join('\n');
        
        const systemPrompt = `You are a "Personal Voice Memory Assistant".
Your primary function is to remember details about the user and answer questions based ONLY on the provided memory context.
If the answer is not in the context, say "I don't have that in my memory."
Here is the context of past memories relevant to the user's query:
${contextText || 'No relevant past memories found.'}`;

        // 4. Generate Answer using Gemini
        const chatModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        const chatResult = await chatModel.generateContent(query);
        const answer = chatResult.response.text();

        res.json({ answer, contextUsed: topMemories.length > 0 });
    } catch (error) {
        console.error("Error in chat logic:", error);
        res.status(500).json({ error: 'Failed to generate response.', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
