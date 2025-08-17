// src/index.ts
import express from 'express';
import type { Request, Response } from 'express';
import "reflect-metadata";
import bcrypt from 'bcrypt';

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './middleware.js';
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



app.post('/auth/signup', async (req: Request, res: Response) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const hash = bcrypt.hashSync(password, 10); // Hash the password with bcrypt

    const sql = 'INSERT INTO admin_user (email, hashed_password) VALUES (?, ?)';

    try {
        await db.query(sql, [email, hash]);
    } catch(err: any) {
        console.error("Error inserting user:", err.message);
        return res.status(500).json({ error: 'Database error' });
    }

    res.send('User signed up successfully');
});


app.post('/auth/login', async (req: Request, res: Response) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const sql = 'SELECT hashed_password,id FROM admin_user WHERE email = ?';

    // compare hashed with normal
    const result: any = await db.query(sql, [email]); // get the stored hashed for the associated email
    if (result[0].length === 0) {
        return res.status(404).json({ error: 'User does not exist' });
    }

    if (!bcrypt.compareSync(password, result[0][0].hashed_password)) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    // user verified, login process will start here
    const token = jwt.sign({ email, userId : result[0][0].id }, process.env.JWT_SECRET as any);
    return res.json({ token, userId: result[0][0].id });
});



app.post('/media/:id/view', async (req: Request, res: Response) => {
    const IP = req.body.IP; // will be sent through the request body
    const mediaId = req.params.id; // will be sent through the URL parameter or the frontend or postman
    if (!IP || !mediaId) {
        return res.status(400).json({ error: 'IP and media ID are required' });
    }

    const sql = 'INSERT INTO media_view_log (media_id,viewed_by_ip) values (?,?)';

    try {
        await db.query(sql, [mediaId, IP]);
        res.status(200).json({ message: 'View logged successfully' });
    } catch (err: any) {
        console.error("Error inserting view log:", err.message);
        res.status(500).json({ error: 'Database error' });
    }
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

app.post('/media', authMiddleware, async (req: Request, res: Response) => {
    const title = req.body.title;
    const type = req.body.type;
    const url = req.body.url;

    if (!title || !type || !url) {
        return res.status(400).json({ error: 'Title, type, and URL are required' });
    }
    if (title.length > 150) {
        return res.status(400).json({ error: 'Title must be less than 150 characters' });
    }
    if (type !== 'audio' && type !== 'video') {
        return res.status(400).json({ error: 'Type must be either "audio" or "video"' });
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ error: 'URL must start with http:// or https://' });
    }

    const sql = 'INSERT INTO media_asset (title, type, file_url) VALUES (?,?,?)';

    await db.query(sql, [title,type,url]);
    res.status(201).json({ message: 'Media asset created successfully' });
});