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