const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ========================================
// POST DATA DARI RECEIVER ESP32
// ========================================
app.post('/api/v1/data', async (req, res) => {

    try {

        const {
            node_id,
            packet_id,
            temperature,
            temperature_kf,
            humidity,
            humidity_kf,
            gas,
            gas_kf,
            pressure,
            pressure_kf,
            lat,
            lon,
            satellites,
            rssi,
            snr
        } = req.body;
        console.log("========== NEW DATA ==========");
        console.log(req.body);
        console.log("packet_id =", packet_id);

        const received_time = new Date();

        const result = await db.query(
            `
            INSERT INTO sensor_data
            (
                node_id,
                packet_id,
                temperature,
                temperature_kf,
                humidity,
                humidity_kf,
                gas,
                gas_kf,
                pressure,
                pressure_kf,
                lat,
                lon,
                satellites,
                rssi,
                snr,
                received_time
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
            )
            RETURNING *
            `,
            [
                node_id,
                packet_id,
                temperature,
                temperature_kf,
                humidity,
                humidity_kf,
                gas,
                gas_kf,
                pressure,
                pressure_kf,
                lat,
                lon,
                satellites,
                rssi,
                snr,
                received_time
            ]
        );

        res.json({
            message: 'Data berhasil disimpan',
            data: result.rows[0]
        });

    } catch (err) {

        console.error("POST ERROR:", err);

        res.status(500).json({
            error: 'Server error'
        });
    }
});

// ========================================
// GET 10 DATA TERBARU
// ========================================
app.get('/api/v1/data', async (req, res) => {

    try {

        const result = await db.query(
            `
            SELECT *
            FROM sensor_data
            ORDER BY id DESC
            LIMIT 10
            `
        );

        res.json(result.rows);

    } catch (err) {

        console.error("GET ERROR:", err);

        res.status(500).json({
            error: 'Server error'
        });
    }
});

// ========================================
// EXPORT CSV
// ========================================
app.get('/api/v1/export', async (req, res) => {

    try {

        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                error: 'Tanggal wajib diisi'
            });
        }

        const start = new Date(date);

        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        const result = await db.query(
            `
            SELECT *
            FROM sensor_data
            WHERE created_at >= $1
            AND created_at < $2
            ORDER BY created_at ASC
            `,
            [start, end]
        );

        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Data tidak ditemukan'
            });
        }

        let csv =
            'node_id,packet_id,temperature,temperature_kf,humidity,humidity_kf,gas,gas_kf,pressure,pressure_kf,lat,lon,satellites,rssi,snr,created_at\n';

        rows.forEach(row => {

            csv +=
                `${row.node_id},` +
                `${row.packet_id},` +
                `${row.temperature ?? ''},` +
                `${row.temperature_kf ?? ''},` +
                `${row.humidity ?? ''},` +
                `${row.humidity_kf ?? ''},` +
                `${row.gas ?? ''},` +
                `${row.gas_kf ?? ''},` +
                `${row.pressure ?? ''},` +
                `${row.pressure_kf ?? ''},` +
                `${row.lat ?? ''},` +
                `${row.lon ?? ''},` +
                `${row.satellites ?? ''},` +
                `${row.rssi ?? ''},` +
                `${row.snr ?? ''},` +
                `${row.created_at}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`data-${date}.csv`);
        res.send(csv);

    } catch (err) {

        console.error("EXPORT ERROR:", err);

        res.status(500).json({
            error: 'Server error export'
        });
    }
});

// ========================================
// ROOT TEST
// ========================================
app.get('/', (req, res) => {

    res.json({
        status: 'OK',
        message: 'Merapi Monitoring API Running'
    });

});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});