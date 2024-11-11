// models/PriceModel.js
export const PriceSchema = {
    technology: String,  // FTTC, FTTP, EFM, Ethernet, etc.
    speed: String,       // "80/20", "330/50", "1000/115", etc.
    price: Number,
    term: Number,        // Contract length in months
    provider: String,    // Zen, BT, TalkTalk, etc.
    notes: String
};