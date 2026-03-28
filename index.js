const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express(); // 🔥 WAJIB DI ATAS

app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;
// =========================
// EXPORT CSV BY DATE
// =========================
app.get('/api/v1/export', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Tanggal wajib diisi' });
        }

        // range tanggal (AMAN)
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        const result = await db.query(
            `SELECT * FROM sensor_data 
             WHERE created_at >= $1 AND created_at < $2
             ORDER BY created_at ASC`,
            [start, end]
        );

        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        let csv = 'node_id,temperature,gas,pressure,lat,lon,delay,distance,created_at\n';

        rows.forEach(row => {
            csv += `${row.node_id},${row.temperature},${row.gas},${row.pressure},${row.lat ?? ''},${row.lon ?? ''},${row.delay ?? ''},${row.distance ?? ''},${row.created_at}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`data-${date}.csv`);
        res.send(csv);

    } catch (err) {
        console.error("EXPORT ERROR:", err);
        res.status(500).json({ error: 'Server error export' });
    }
});
// =========================
// INSERT DATA (POST)
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

        const received_time = new Date();

        // ⏱ delay
        let delay = null;
        if (sent_time) {
            const sent = new Date(sent_time);
            delay = (received_time - sent) / 1000;
        }

        // 📏 distance
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

            return R * c;
        }

        const BASE_LAT = -7.54;
        const BASE_LON = 110.44;

        let distance = null;
        if (lat && lon) {
            distance = calculateDistance(lat, lon, BASE_LAT, BASE_LON);
        }

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
            message: 'Data berhasil disimpan',
            data: result.rows[0],
        });

    } catch (err) {
        console.error("POST ERROR:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// =========================
// GET DATA (FLUTTER)
// =========================
app.get('/api/v1/data', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM sensor_data 
             ORDER BY created_at DESC 
             LIMIT 10`
        );

        res.json(result.rows);
    } catch (err) {
        console.error("GET ERROR:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});