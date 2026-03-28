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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});