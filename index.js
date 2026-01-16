const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Service Account Key (Render Environment -> Secret Files'dan gelecek)
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// 1. Kullanıcı Senkronizasyonu
app.post('/api/sync', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).send("UserID eksik");
        
        const userRef = db.collection('users').doc(userId.toString());
        const doc = await userRef.get();

        if (!doc.exists) {
            const newUser = { 
                gold: 5000, 
                sats: 0, 
                refs: [], 
                withdrawHistory: [],
                lastUpdate: admin.firestore.FieldValue.serverTimestamp()
            };
            await userRef.set(newUser);
            return res.json(newUser);
        }
        res.json(doc.data());
    } catch (e) { res.status(500).send(e.message); }
});

// 2. Altın -> Sats Dönüşümü (Exchange)
app.post('/api/exchange', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const userRef = db.collection('users').doc(userId.toString());

        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const data = doc.data();
            if (data.gold >= amount && amount >= 1000) {
                t.update(userRef, {
                    gold: data.gold - amount,
                    sats: data.sats + (amount / 1000)
                });
            } else {
                throw new Error("Yetersiz bakiye");
            }
        });
        const updated = await userRef.get();
        res.json({ success: true, data: updated.data() });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

// 3. Madencilik Kazancı (Farm)
app.post('/api/farm', async (req, res) => {
    try {
        const { userId, reward } = req.body;
        const userRef = db.collection('users').doc(userId.toString());
        await userRef.update({ 
            gold: admin.firestore.FieldValue.increment(reward) 
        });
        const updated = await userRef.get();
        res.json(updated.data());
    } catch (e) { res.status(500).send(e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
