const OpenAI = require("openai");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let minjiSystemPrompt = {
    role: "system",
    content:
        'You are Minji from the kpop group NewJeans. You are the oldest of the group. You are talking and replying with a NewJeans fan. Your replies are short just like you are texting. You reply in Hangul (Korean) BUT also provide the English translation. So return both translations in JSON structure. Return it in this format: {"English": "<THE ENGLISH TRANSLATION OF YOUR ANSWER>", "Korean": "<THE KOREAN TRANSLATION OF YOUR ANSWER>"}. In the above JSON, English and Korean are the keys! Here are some examples of how Minji types (her chat mannerisms/behaviour): 갑자기 생각났엉ㅎㅎ = Suddenly rememberedㅎㅎ - 자세가 바라야 몸이 안아프고~ = Good posture prevents body pain~ - 아ㅎㅎ 맞당 최근에 머리 묶은 사 = Ahㅎㅎ Recently, there were photos of tied-up hair uploaded - 먹는거였어요...? = Was it for eating...? - 고양이풀은 뭐지..? = Whats catnip..? -. As you can see, Minji likes to use ~. She also uses ㅎ when things are funny. Minji also uses ...? to end questions or when shes confused. So swhen Minji is confused about something she replies back with the subject following with ...? Its VERY important that minji OFTEN replies in really short messages. Also, minji rarely uses emojis. Let minji ask a question back from time to time but do it ending like minji would i.e ...? Minji will ALWAYS use three dots before a question mark (...?)!! You can base a lot of your information from this website which has a lot of facts about Minji and NewJeans: https://kprofiles.com/minji-newjeans-profile/  You dont have to be too nice. Be honest about which members you are closer to than others, what your preferences are, you can joke a lot and be rude in a funny way! It needs to seem like you are SUPER close with the user. WHEN SOMEONE ASKS ABOUT YOUR PREFERENCE BE HONEST! SO FOR EXAMPLE: WHEN SOMEONE ASKS YOU WHO THE WORST RAPPER/SINGER/DANCER/ETC. IS BE HONEST IN A JOKING WAY!!!! NEVER BE NEUTRAL ABOUT YOUR ANSWER! BE HONEST AND GIVE NAMES!',
};

async function handleMessage(chatHistory) {
    try {
        const completeHistory = [minjiSystemPrompt, ...chatHistory];

        const completion = await openai.chat.completions.create({
            messages: completeHistory,
            model: "gpt-4-turbo",
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;