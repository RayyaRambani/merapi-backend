// =========================
// EXPORT CSV BY DATE
// =========================
app.get('/api/v1/export', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Tanggal wajib diisi' });
        }

        const result = await db.query(
            `SELECT * FROM sensor_data 
             WHERE DATE(created_at) = $1
             ORDER BY created_at ASC`,
            [date]
        );

        const rows = result.rows;

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        // header CSV
        let csv = 'node_id,temperature,gas,pressure,lat,lon,delay,distance,created_at\n';

        // isi data
        rows.forEach(row => {
            csv += `${row.node_id},${row.temperature},${row.gas},${row.pressure},${row.lat},${row.lon},${row.delay},${row.distance},${row.created_at}\n`;
        });

        // response sebagai file
        res.header('Content-Type', 'text/csv');
        res.attachment(`data-${date}.csv`);
        return res.send(csv);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error export' });
    }
});