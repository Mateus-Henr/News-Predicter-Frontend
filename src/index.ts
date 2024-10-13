import express, {Request, Response} from "express";
import bodyParser from "body-parser";
import {Chat, Client, Message} from "whatsapp-web.js";
import axios from "axios";
import qrcode from "qrcode-terminal";

const app = express();
app.use(bodyParser.json());

const client = new Client({
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu"
        ]
    }
});

declare global
{
    var GROUP_ID: string | undefined;
}

client.on("qr", (qr: string) =>
{
    qrcode.generate(qr, {small: true});
});

client.on("ready", async () =>
{
    console.log("WhatsApp client is ready!");

    try
    {
        const chats = await client.getChats();
        const group = chats.find((chat: Chat) => chat.isGroup && chat.name === "Stock News Analyses");

        if (group)
        {
            console.log(`Group ID: ${group.id._serialized}`);
            global.GROUP_ID = group.id._serialized;
        }
        else
        {
            console.error("Group not found");
        }
    }
    catch (error)
    {
        console.error("Error while getting chats:", error);
    }
});

client.on("message_create", async (message: Message) =>
{
    try
    {
        const chat = await message.getChat();
        if (chat.isGroup && chat.name !== "Stock News Analyses")
        {
            return;
        }

        const content = message.body;

        if (content.startsWith("!news"))
        {
            const messageString = content.replace("!news ", "").split(" ");
            const ticker = messageString[0];
            const url = messageString[1];

            if (!ticker || !url || !url.startsWith("http"))
            {
                await message.reply("Invalid data.");
                return;
            }

            try
            {
                const response = await axios.post(`${process.env.BASE_URL}/news`,
                    {
                        ticker: ticker,
                        url: url
                    });
                await message.reply(response.data["message"]);
            }
            catch (error)
            {
                console.error("Error sending news request:", error);
                await message.reply("Processing error.");
                return;
            }
        }
    }
    catch (error)
    {
        console.error("Error processing message:", error);
    }
});

app.post("/send-message", async (req: Request, res: Response): Promise<any> =>
{
    const {message}: { message: string } = req.body;

    if (!message)
    {
        return res.status(400).json({error: "Message is required"});
    }

    if (!global.GROUP_ID)
    {
        return res.status(500).json({error: "Group ID not found"});
    }

    try
    {
        await client.sendMessage(global.GROUP_ID, message);
        res.status(200).json({status: "Message sent to group"});
    }
    catch (error)
    {
        console.error("Failed to send message:", error);
        res.status(500).json({error: "Failed to send message"});
    }
});

client.initialize().then(r => console.log("Initialized"));

app.listen(3000, () =>
{
    console.log("Server running on port 3000");
});