/**
 * SATS MASTER ATM - FIREBASE BACKEND (GÜNCEL)
 */
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// --- FIREBASE BAĞLANTISI (Senin JSON Bilgilerinle) ---
const serviceAccount = {
  "project_id": "satsatm-ea309",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGHlEK2ZuVjZdM\nacovaNCdUUB22AwmIxXZbKabgzNk/8APL6rRmc/M/pXzqwHZLgH0oTW1qnmyVSWl\nWuxg33A7Uued1wvF948CJ3Ekt8Mpah6qWTT/RuDPh8xTBur18y5ynySvm1bhXBwU\nBitDsVZJwhPoMeP/xD4yBWfQLQDVlOjTS1L223O5ZoAIV1BEr/lVMDpcOD4hlnj2\nGMh7Jdkt+GElY0lZ0nasMgjn4q/Cxd3AnYmoR7zjTYLY8rG/dkeXjElEcgcHvn3a\nlYxK53S+bF8fklxmjuhoS0bcAygb1qlGQW5mHXB6UokgPTVQZTCFPTVs4SuUjUUw\nH4a+LRY3AgMBAAECggEAEOnnq1B2mubyosBpVXDSVovoP/0j1GGsbNp8wswJqDa5\nU9KS97/04KBfduUDjGIEIrlcl3zNVO81/o7rnT2WHEpwoaYJSEZhPCLX4vWZQMDh\ni1OAVcbcTHtgczok9whiz8BMZn2Rhj3R29fG+8l4/2UFRA52U5CSarzRZxFgf9tG\n/pR1WprVyBJeIuCj0+ca6V0ZFRKtPsLXnVMfBLkmjFPygku+SYbjhuOCoh0w5TXY\nrTmwtjss1kuYPgLumHZ7FOru+U0HxYJPNAwxEXzihlbBLxc3kjhI3iqC1Xn2V6eW\nFpVVGafxa0lvW4S0Ho9bnCry4rD8b0pFvWaudJEW2QKBgQD4OE9gEtadw8RCdqWT\nYY+rN5XFhGZRx5zohQoofYfsr3O/XTOfa1dqPJC9yUCYuAW3GBEuhZWzDdfmzSxY\nmhpGHU3yLpi8INtRFXmqoaUxTuPUMCyiy5fretZf8CIy27Js3xaAdE/9N23wnOU6\nLFSRB4X4zERUHq9AtEzFDvllFQKBgQDMU/9KvNgGGSIGbEbeCOxKQDGcadXvZaNv\nlPD1vjFJ54DjM2EBxOGVWHnrjeruh8P0L+vCIknxPeYNFEb74P9rD+hqv9Q14Che\nrCd/fDzo1IxFTYsH6wr6noL+n4XScsu2JlA8ANqf0PgmQ73BzDF3qPl84lKqswJv\n7oMae9b5GwKBgQCLBPanx0U+LOOhmdPYPH77lPEkI6guy059B+4NiWj0TbvVBL0h\n3zuhO3SRZsLwBbjlt+v/kz+pfepa0LSylvR6KnV6W1CdpQVQX2e6AjiD6jw9nhGR\nx9c5Qp4IM3Tj6RoAUd3Had1W45GGfkkAEM34QC9vjfAC8QCUi6ang2B4lQKBgGTz\n62KFw0XgDQuXW7xANF7LMLfTIrxRP1rV/+eqvLeDBg87R2aUW9BqEnLrf3Oy6IIx\nWw5j2pyytIMpzZiNJiVDitWTScoEom2EKU+3lnCC83saQOL8okQJJTegoYHE7hlk\n/Kdo1Ju5p6FgPtUNijNQ7VNiju1/3GhpM6VWInSZAoGAMgTsoikTwkBChZWoVouz\n/9z1NW1Nl8gRHwLm5Oc3nf5Vb/RnM9DIbabDJbJD2ZaKnZ35e6eK6RFdk2K1myOQ\nUG9TUXJdGQ8MYdRICCOpByhIpfVuWY8O2MVjYEgVGlSWlFxLfnU+tUDC+nem95qh\nFSIvlZIX++nC7znZOU60Nag=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@satsatm-ea309.iam.gserviceaccount.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const usersRef = db.collection('users');

// --- API ---

app.post('/api/sync', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "No user ID" });
    try {
        const doc = await usersRef.doc(String(userId)).get();
        if (!doc.exists) {
            const newUser = { gold: 0, sats: 0, refs: [], withdrawals: [] };
            await usersRef.doc(String(userId)).set(newUser);
            return res.json(newUser);
        }
        res.json(doc.data());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/farm', async (req, res) => {
    const { userId, reward } = req.body;
    try {
        const userDoc = usersRef.doc(String(userId));
        await userDoc.update({
            gold: admin.firestore.FieldValue.increment(reward)
        });
        const updated = await userDoc.get();
        res.json({ success: true, newBalance: updated.data().gold });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/withdrawals', async (req, res) => {
    try {
        const snapshot = await usersRef.get();
        let all = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.withdrawals && data.withdrawals.length > 0) {
                all.push({ userId: doc.id, ...data });
            }
        });
        res.json(all);
    } catch (e) { res.json([]); }
});

// "Cannot GET /" Hatasını çözen ana rota
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server Live on port ${PORT}`));
