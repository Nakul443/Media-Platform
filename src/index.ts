// src/index.ts
import express from 'express';
import type { Request, Response } from 'express';
import "reflect-metadata";

import dotenv from 'dotenv';
import mysql from 'mysql2';
dotenv.config(); // Load environment variables from .env file

const app = express();
const port = 3000;
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST ?? '', // if doesn't exist, use empty string
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? ''
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL database");

    // start the server only after successful DB connection
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
});


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

    db.query(sql, [mediaId,IP], (err, result) => {
        if (err) {
            console.error("Error inserting view log:", err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(`Media ID ${mediaId} viewed by IP ${IP}`);
        res.status(200).json({ message: 'View logged successfully' });
    });
});