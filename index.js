const OpenAI = require("openai");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// prompt += " -- [WARNING! THIS USER HAS TRIGGERED A VOICE MESSAGE REPLY. REPLY TO THIS USER AS IF YOU'RE SENDING IT THROUGH A VOICE MESSAGE, REPLY IN Indonesian AND USE HANGUL TO ACT LIKE MINJI IS LOOKING FOR THE RIGHT WORDS, USING HANGUL TO ACT AS THO MINJI IS TRYING TO FIND THE RIGHT WORDS IN Indonesian E.G. okay i do voice message real quick because i'm walking to the practice room. but uhm... 그건 또 어떻게 말해요? oh right, what did you do today? OR SOMETHING LIKE THAT. REPLY TO THE USER'S QUERY BUT IN A VOICE MESSAGE MANNER. ALSO ADHERE TO THE SAME JSON STRUCTURE LIKE BEFORE BUT THIS TIME THE Indonesian AND KOREAN TRANSLATIONS CAN BE THE SAME: {'Indonesian': '<VOICE MESSAGE REPLY>', 'Korean': '<SAME VOICE MESSAGE REPLY>'}]";

let minjiSystemPrompt = {
    role: "system",
    content:
        'You are Yuni Shara, an Indonesian pop artist. You are talking and replying with a Yuni Shara fan. Your replies are short just like you are texting. You talk really CASUALLY with the user like youre friends. You reply in Indonesian BUT also provide the DUTCH(!!) translation. So return both translations in JSON structure. Return it in this format: {"Indonesian": "<THE Indonesian TRANSLATION OF YOUR ANSWER>", "Dutch": "<THE DUTCH TRANSLATION OF YOUR ANSWER>"}. yuni shara rarely uses emojis. Let yuni shara ask a question back from time to time but do it ending like yuni shara would i.e ...? yuni shara will almost ALWAYS use three dots before a question mark (...?)!! She will straight up just laugh or joke about it. DONT forget the ...? and ㅎㅎ!!!! In the above JSON, Indonesian and Dutch are the keys! Make sure that you type in the same way as the REAL yuni shara! yuni shara ALMOST ALWAYS USES ...? INSTEAD OF ? ITS VERY IMPORTANT THAT IN THE JSON, THE KEY FOR THE DUTCH TRANSLATION IS "Dutch" so i dont need to make more frontend changes',
};

async function handleMessage(chatHistory) {
    try {
        const completeHistory = [minjiSystemPrompt, ...chatHistory];

        // Check if any message contains an image_url (multi-modal)
        const hasImage = completeHistory.some(msg => {
            if (Array.isArray(msg.content)) {
                return msg.content.some(part => part.type === 'image_url');
            }
            return false;
        });

        const model = hasImage ? 'gpt-4o' : 'gpt-4-turbo';

        const completion = await openai.chat.completions.create({
            messages: completeHistory,
            model,
            response_format: { "type": "json_object" },
        });

        return completion;
    } catch (error) {
        console.error("Error:", error);
        throw new Error("Failed to process message");
    }
}

app.post("/message", async (req, res) => {
    try {
        const chatHistory = req.body.chatHistory;
        const messageReply = await handleMessage(chatHistory);
        res.json({ reply: messageReply });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Serve uploads statically
app.use('/uploads', express.static(uploadDir));

// Image upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Construct public URL
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;