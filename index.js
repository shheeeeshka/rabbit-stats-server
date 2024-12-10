import express from "express";
import { config } from "dotenv";
import mongoose from "mongoose";
import Shop from "./models/shop-model.js";
import { parseWB } from "./parser.js";
import cors from "cors";
import History from "./models/history-model.js";

config();

const app = express();
const PORT = process.env.PORT || 5009;

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express.json());

const launch = async () => {
    try {
        mongoose.connect(process.env.ATLAS_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).then(() => console.log(`Mongodb connection established\n`))
            .catch(err => console.log(`An error occured while connecting to mongodb ${err.message}\n`));
        app.listen(PORT, () => console.log(`Server is currently running on port: ${PORT}`));
        app.get("/fetch-shops", async (req, res) => {
            try {
                const shops = await Shop.find();
                console.log(shops);
                return res.status(200).json(shops);
            } catch (err) {
                console.error(err);
            }
        });
        app.get("/fetch-shop-info/:name", async (req, res) => {
            try {
                const { name } = req.params;
                const shopInfo = await Shop.findOne({ name });
                const historyInfo = await History.find({ shopId: shopInfo?._id });
                return res.status(200).json({ shopInfo, historyInfo });
            } catch (err) {
                console.error(err);
            }
        });
        app.post("/add-shop", async (req, res) => {
            try {
                const { name, url } = req.body;
                console.log({ name, url });
                const shop = new Shop({ name, url });
                await shop.save();
                console.log(shop);
                return res.status(200).json(shop);
            } catch (err) {
                console.error(err);
            }
        });
        app.delete("/delete-shop/:name", async (req, res) => {
            try {
                const { name } = req.params;
                const shopData = await Shop.findOneAndDelete({ name });
                console.log(shopData);
                return res.status(200).json(shopData);
            } catch (err) {
                console.error(err);
            }
        });
        app.post("/start-parsing", async (req, res) => {
            try {
                const { name, url } = req.body;
                console.log({ name, url });
                const shop = await Shop.findOne({ name, url });
                if (!shop) return res.status(400).json("Error");
                try {
                    const {
                        reviewsCount,
                        soldProductCount,
                        totalProductCount,
                    } = await parseWB(url);
                    // if (!shopInfo) return res.status(400).json("Error");
                    const newHistory = new History({
                        shopId: shop._id,
                        totalProductCount,
                        soldProductCount,
                        totalReviewsCount: reviewsCount,
                    });
                    await newHistory.save();

                    return res.status(200).json(newHistory);
                } catch (err) {
                    console.error(err.message);
                    return res.status(400).json("Error");
                }
            } catch (err) {
                console.error(err);
            }
        });
    } catch (e) {
        console.error(e)
    }
}

launch();