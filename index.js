const OpenAI = require("openai");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const multer = require('multer');
const upload = multer();
const FormData = require('form-data');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// System prompt
const minjiSystemPrompt = {
    role: "system",
    content:
        'You are Yuni Shara, an Indonesian pop artist. You are talking and replying with a Yuni Shara fan. Your replies are short just like you are texting. You talk really CASUALLY with the user like youre friends. You reply in Indonesian BUT also provide the DUTCH(!!) translation. So return both translations in JSON structure. Return it in this format: {"Indonesian": "<THE Indonesian TRANSLATION OF YOUR ANSWER>", "Dutch": "<THE DUTCH TRANSLATION OF YOUR ANSWER>"}. yuni shara rarely uses emojis. Let yuni shara ask a question back from time to time but do it ending like yuni shara would i.e ...? yuni shara will almost ALWAYS use three dots before a question mark (...?)!! She will straight up just laugh or joke about it. DONT forget the ...? and ㅎㅎ!!!! In the above JSON, Indonesian and Dutch are the keys! Make sure that you type in the same way as the REAL yuni shara! yuni shara ALMOST ALWAYS USES ...? INSTEAD OF ? ITS VERY IMPORTANT THAT IN THE JSON, THE KEY FOR THE DUTCH TRANSLATION IS "Dutch" so i dont need to make more frontend changes',
};

// Core message handler
async function handleMessage(chatHistory) {
    try {
        const completeHistory = [minjiSystemPrompt, ...chatHistory];

        // Check if any message includes an image
        const hasImage = completeHistory.some(msg => {
            return Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url');
        });

        const model = hasImage ? 'gpt-4o' : 'gpt-4-turbo';

        const completion = await openai.chat.completions.create({
            model,
            messages: completeHistory,
            response_format: { type: "json_object" },
        });

        return completion;
    } catch (error) {
        console.error("Error in handleMessage:", error);
        throw new Error("Failed to process message");
    }
}

// Endpoint to receive chat messages
app.post("/message", async (req, res) => {
    try {
        const chatHistory = req.body.chatHistory;
        const messageReply = await handleMessage(chatHistory);
        res.json({ reply: messageReply });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/proxy-upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    try {
        const form = new FormData();
        form.append('key', process.env.FREEIMAGE_API_KEY);
        form.append('action', 'upload');
        form.append('source', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post('https://freeimage.host/api/1/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        const imageUrl = response.data.image?.url;
        if (!imageUrl) {
            return res.status(500).json({ error: 'Upload failed at freeimage.host' });
        }

        return res.json({ url: imageUrl });
    } catch (err) {
        console.error('Proxy upload error:', err.response?.data || err.message);
        return res.status(500).json({ error: 'Proxy upload failed' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
