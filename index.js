const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// TEST ROOT
// =========================
app.get('/', (req, res) => {
    res.send('API Merapi Running');
});


// =========================
// INSERT DATA (ESP32)
// =========================
app.post('/api/v1/data', async (req, res) => {
    try {
        const { node_id, temperature, gas, pressure, event_time } = req.body;

        const result = await db.query(
            `INSERT INTO sensor_data 
       (node_id, temperature, gas, pressure, event_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [node_id, temperature, gas, pressure, event_time]
        );

        res.json({
            message: 'Data berhasil disimpan',
            data: result.rows[0],
        });
    } catch (err) {
        console.error(err);
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