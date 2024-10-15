require("dotenv").config();
import {isMainThread, parentPort, Worker} from "worker_threads";
import express, {Request, Response} from "express";
import bodyParser from "body-parser";
import {Client, Message} from "./whatsapp-web.js";
import axios from "axios";
import QRCode from "qrcode";

// Group ID constant
const GROUP_ID = "120363304492390966@g.us";

// Check if we're in the main thread
if (isMainThread)
{
    // Main thread (WhatsApp Client logic)

    // Initialize WhatsApp Client
    const client = new Client({
        puppeteer: {
            headless: true,
            args: ["--no-sandbox"],
            timeout: 0,
        },
    });

    // WhatsApp QR Code Handler
    client.on("qr", (qr: string) =>
    {
        QRCode.toDataURL(qr, function (err, url)
        {
            console.log(url);
        });
    });

    // WhatsApp Ready Event
    client.on("ready", async () =>
    {
        console.log("WhatsApp client is ready!");
    });

    // WhatsApp Message Handling
    client.on("message_create", async (message: Message) =>
    {
        // Your message processing logic (as before)
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
    });

    // Initialize WhatsApp Client
    client.initialize().then(() => console.log("WhatsApp Client Initialized"));

    // Create a worker thread for the Express app
    const worker = new Worker(__filename); // Re-execute this file in a worker thread
    worker.on("message", async (msg: any) =>
    {
        if (msg.type === "sendMessage")
        {
            const {message, GROUP_ID} = msg.data;
            try
            {
                await client.sendMessage(GROUP_ID, message);
                console.log("Message sent from Express app to WhatsApp group.");
            }
            catch (error)
            {
                console.error("Failed to send message:", error);
            }
        }
    });

    worker.on("error", (error) =>
    {
        console.error("Worker thread error:", error);
    });

    worker.on("exit", (code) =>
    {
        if (code !== 0)
        {
            console.error(`Worker thread stopped with exit code ${code}`);
        }
    });

}
else
{
    // Worker thread (Express App logic)

    const app = express();
    app.use(bodyParser.json());

    app.post("/send-message", (req: Request, res: Response): any =>
    {
        const {message} = req.body;

        if (!message)
        {
            return res.status(400).json({error: "Message is required"});
        }

        // Send the message to the main thread (WhatsApp client)
        // @ts-ignore
        parentPort.postMessage({
            type: "sendMessage",
            data: {message, GROUP_ID},
        });

        res.status(200).json({status: "Message sent to WhatsApp group"});
    });

    app.listen(3000, () =>
    {
        console.log("Express server running on port 3000");
    });
}
