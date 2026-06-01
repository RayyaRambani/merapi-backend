// =========================
// INSERT DATA (POST)
// =========================
app.post('/api/v1/data', async (req, res) => {
    try {

        const {
            node_id,
            packet_id,
            temperature,
            gas,
            pressure,
            humidity,
            bmp_temperature,
            altitude,
            satellites,
            rssi,
            snr,
            lat,
            lon,
            sent_time
        } = req.body;

        const received_time = new Date();

        // Delay
        let delay = null;

        if (sent_time) {
            const sent = new Date(sent_time);
            delay = (received_time - sent) / 1000;
        }

        // Distance
        function calculateDistance(lat1, lon1, lat2, lon2) {

            const R = 6371e3;

            const toRad = (deg) => deg * Math.PI / 180;

            const φ1 = toRad(lat1);
            const φ2 = toRad(lat2);

            const Δφ = toRad(lat2 - lat1);
            const Δλ = toRad(lon2 - lon1);

            const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) *
                Math.cos(φ2) *
                Math.sin(Δλ / 2) *
                Math.sin(Δλ / 2);

            const c =
                2 * Math.atan2(
                    Math.sqrt(a),
                    Math.sqrt(1 - a)
                );

            return R * c;
        }

        const BASE_LAT = -7.54;
        const BASE_LON = 110.44;

        let distance = null;

        if (
            lat !== undefined &&
            lon !== undefined &&
            lat !== 0 &&
            lon !== 0
        ) {
            distance =
                calculateDistance(
                    lat,
                    lon,
                    BASE_LAT,
                    BASE_LON
                );
        }

        const result = await db.query(
            `
            INSERT INTO sensor_data
            (
                node_id,
                packet_id,
                temperature,
                gas,
                pressure,
                humidity,
                bmp_temperature,
                altitude,
                satellites,
                rssi,
                snr,
                lat,
                lon,
                event_time,
                received_time,
                delay,
                distance
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,
                $10,$11,$12,$13,$14,$15,$16,$17
            )
            RETURNING *
            `,
            [
                node_id,
                packet_id,
                temperature,
                gas,
                pressure,
                humidity,
                bmp_temperature,
                altitude,
                satellites,
                rssi,
                snr,
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
            data: result.rows[0]
        });

    } catch (err) {

        console.error("POST ERROR:", err);

        res.status(500).json({
            error: 'Server error'
        });
    }
});