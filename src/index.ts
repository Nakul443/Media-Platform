// src/index.ts
import express from 'express';
import type { Request, Response } from 'express';
import "reflect-metadata";

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { start } from 'repl';
dotenv.config(); // Load environment variables from .env file

const app = express();
const port = 3000;
app.use(express.json());

let db: mysql.Connection;

(async () => {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST ?? '',
            user: process.env.DB_USER ?? '',
            password: process.env.DB_PASSWORD ?? '',
            database: process.env.DB_NAME ?? ''
        });
        console.log("✅ Connected to MySQL database");

        // start the server only after successful DB connection
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (err: any) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
})();


app.get('/', (req: Request, res: Response) => {
    res.send('Hello from TypeScript Express!');
});


app.post('/media/:id/view', (req: Request, res: Response) => {
    const IP = req.body.IP; // will be sent through the request body
    const mediaId = req.params.id; // will be sent through the URL parameter or the frontend or postman
    if (!IP || !mediaId) {
        return res.status(400).json({ error: 'IP and media ID are required' });
    }

    const sql = 'INSERT INTO media_view_log (media_id,viewed_by_ip) values (?,?)';

    (async () => {
        try {
            await db.query(sql, [mediaId, IP]);
            console.log(`Media ID ${mediaId} viewed by IP ${IP}`);
            res.status(200).json({ message: 'View logged successfully' });
        } catch (err: any) {
            console.error("Error inserting view log:", err.message);
            res.status(500).json({ error: 'Database error' });
        }
    })();
});


app.get('/media/:id/analytics', async (req: Request, res: Response) => {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0]; // default to today if no end date provided
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
    }
    const mediaId = req.params.id;
    if (!mediaId) {
        return res.status(400).json({ error: 'Media ID is required' });
    }
    console.log(startDate, endDate, mediaId);
    const totalViewsQuery = 'SELECT COUNT(*) AS total_views FROM media_view_log WHERE media_id = ?';
    const unique_ipsQuery = 'SELECT COUNT(DISTINCT viewed_by_ip) AS unique_ips FROM media_view_log WHERE media_id = ?';
    const viewsPerDayQuery = `
  SELECT DATE(timestamp) AS view_date, COUNT(*) AS daily_views
  FROM media_view_log
  WHERE timestamp BETWEEN ? AND ?
  GROUP BY DATE(timestamp)
  ORDER BY view_date`;

    const totalViews = db.query(totalViewsQuery, [mediaId]);
    const unique_ips = db.query(unique_ipsQuery, [mediaId]);
    const viewsPerDay = db.query(viewsPerDayQuery, [startDate, endDate]);

    const [totalViewsResult, uniqueIpsResult, viewsPerDayResult] = await Promise.all([totalViews, unique_ips, viewsPerDay]);

    console.log(totalViewsResult);
    console.log(uniqueIpsResult);
    console.log(viewsPerDayResult);

    if (!totalViewsResult || !uniqueIpsResult || !viewsPerDayResult) {
        return res.status(500).json({ error: 'Failed to fetch analytics data' });
    }

    const viewObject: { [key: string]: number } = {};

    for (const row of (viewsPerDayResult as any[])[0]) {
        if (row.view_date) {
            const date = new Date(row.view_date);
            const formattedDate : any = date.toISOString().split("T")[0];
            viewObject[formattedDate] = row.daily_views;
        }
    }

    const response = {
        totalViews: (totalViewsResult as any[])[0][0].total_views,
        uniqueIps: (uniqueIpsResult as any[])[0][0].unique_ips,
        viewsPerDay: viewObject
    };

    res.send(response);
});