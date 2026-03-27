const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// BASE LOCATION (ISI LOKASI KAMU)
// =========================
const BASE_LAT = -7.54;
const BASE_LON = 110.44;

// =========================
// HAVERSINE (HITUNG JARAK)
// =========================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (deg) => deg * Math.PI / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // meter
}

// =========================
// TEST ROOT
// =========================
app.get('/', (req, res) => {
    res.send('API Merapi Running 🚀');
});

// =========================
// INSERT DATA + ANALISIS
// =========================
app.post('/api/v1/data', async (req, res) => {
    try {
        const {
            node_id,
            temperature,
            gas,
            pressure,
            lat,
            lon,
            sent_time
        } = req.body;

        console.log("DATA MASUK:", req.body);

        const received_time = new Date();

        // ⏱️ HITUNG DELAY (detik)
        let delay = null;
        if (sent_time) {
            const sent = new Date(sent_time);
            delay = (received_time - sent) / 1000;
        }

        // 📏 HITUNG JARAK (meter)
        let distance = null;
        if (lat && lon) {
            distance = calculateDistance(lat, lon, BASE_LAT, BASE_LON);
        }

        console.log("DELAY:", delay);
        console.log("DISTANCE:", distance);

        const result = await db.query(
            `INSERT INTO sensor_data 
            (node_id, temperature, gas, pressure, lat, lon, event_time, received_time, delay, distance)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *`,
            [
                node_id,
                temperature,
                gas,
                pressure,
                lat,
                lon,
                sent_time,
                received_time,
                delay,
                distance
            ]
        );

        res.json({
            message: 'Data + analisis berhasil disimpan',
            data: result.rows[0],
        });

    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// =========================
// GET DATA (Flutter)
// =========================
app.get('/api/v1/data', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 50`
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});