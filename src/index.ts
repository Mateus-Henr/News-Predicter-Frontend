require("dotenv").config();
import express, {Request, Response} from "express";
import bodyParser from "body-parser";
import {Client, Message} from "./whatsapp-web.js";
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
        ],
        executablePath: "/usr/bin/chromium",
        timeout: 100000
    },
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html', }
});

const GROUP_ID = "120363304492390966@g.us";

client.on("qr", (qr: string) =>
{
    qrcode.generate(qr, {small: true});
});

client.on("ready", async () =>
{
    console.log("WhatsApp client is ready!");
});

client.on("message_create", async (message: Message) =>
{
    try
    {
        const chat = await message.getChat();
        if (chat.isGroup && chat.id._serialized !== GROUP_ID)
        {
            return;
        }

        const content = message.body;

        if (content.startsWith("!news"))
        {
            const messageString = content.replace("!news ", "").split(" ");
            const ticker = messageString[0];
            const url = messageString[1];

            // Check if ticker and URL are valid
            if (!ticker || !url || !url.startsWith("http"))
            {
                throw new Error("Error: Invalid URL or Ticker.");
            }

            try
            {
                const response = await axios.post(`${process.env.BASE_URL}/news`, {
                    ticker: ticker,
                    url: url
                });

                // Check response status and handle accordingly
                if (response.status === 200)
                {
                    await message.reply(response.data["message"]);
                }
                else if (response.status === 400)
                {
                    throw new Error(response.data.error || "Unable to process news request.");
                }
                else
                {
                    throw new Error("Unexpected response from news API.");
                }
            }
            catch (apiError: any)
            {
                throw new Error(`API Error: ${apiError.message || apiError}`);
            }
        }
        else if (content.startsWith("!add"))
        {
            const ticker = content.replace("!add ", "").trim();

            if (!ticker)
            {
                throw new Error("Error: Invalid Ticker.");
            }

            try
            {
                const response = await axios.post(`${process.env.BASE_URL}/add-ticker`, {
                    ticker: ticker
                });

                if (response.status === 200)
                {
                    await message.reply(`Ticker ${ticker} has been added successfully.`);
                }
                else if (response.status === 400)
                {
                    throw new Error(response.data.error || "Unable to add ticker.");
                }
                else
                {
                    throw new Error("Unexpected response from add-ticker API.");
                }
            }
            catch (apiError: any)
            {
                throw new Error(`API Error: ${apiError.message || apiError}`);
            }
        }
        else if (content.startsWith("!remove"))
        {
            const ticker = content.replace("!remove ", "").trim();

            if (!ticker)
            {
                throw new Error("Error: Invalid Ticker.");
            }

            try
            {
                const response = await axios.post(`${process.env.BASE_URL}/remove-ticker`, {
                    ticker: ticker
                });

                if (response.status === 200)
                {
                    await message.reply(`Ticker ${ticker} has been removed successfully.`);
                }
                else if (response.status === 400)
                {
                    throw new Error(response.data.error || "Unable to remove ticker.");
                }
                else
                {
                    throw new Error("Unexpected response from remove-ticker API.");
                }
            }
            catch (apiError: any)
            {
                throw new Error(`API Error: ${apiError.message || apiError}`);
            }
        }
        else if (content.startsWith("!clear-news"))
        {
            try
            {
                const response = await axios.get(`${process.env.BASE_URL}/clear-news`);

                if (response.status === 200)
                {
                    await message.reply("News data has been cleared successfully.");
                }
                else if (response.status === 400)
                {
                    throw new Error(response.data.error || "Unable to clear news data.");
                }
                else
                {
                    throw new Error("Unexpected response from clear-news API.");
                }
            }
            catch (apiError: any)
            {
                throw new Error(`API Error: ${apiError.message || apiError}`);
            }
        }
        else if (content.startsWith("!get"))
        {
            try
            {
                const response = await axios.get(`${process.env.BASE_URL}/get-tickers`);

                if (response.status === 200)
                {
                    const tickers = response.data;

                    if (tickers.length > 0)
                    {
                        await message.reply(`Tickers in watchlist: ${tickers.join(", ")}`);
                    }
                    else
                    {
                        await message.reply("No tickers found in the watchlist.");
                    }
                }
                else if (response.status === 400)
                {
                    throw new Error(response.data.error || "Unable to retrieve tickers.");
                }
                else
                {
                    throw new Error("Unexpected response from get-tickers API.");
                }
            }
            catch (apiError: any)
            {
                throw new Error(`API Error: ${apiError.message || apiError}`);
            }
        }
    }
    catch (error: any)
    {
        await message.reply(error.toString());
    }
});

app.post("/send-message", async (req: Request, res: Response): Promise<any> =>
{
    const {message}: { message: string } = req.body;

    if (!message)
    {
        return res.status(400).json({error: "Message is required"});
    }

    try
    {
        await client.sendMessage(GROUP_ID, message);
        res.status(200).json({status: "Message sent to group"});
    }
    catch (error)
    {
        console.error("Failed to send message:", error);
        res.status(500).json({error: "Failed to send message"});
    }
});

client.initialize();

app.listen(3000, () =>
{
    console.log("Server running on port 3000");
});