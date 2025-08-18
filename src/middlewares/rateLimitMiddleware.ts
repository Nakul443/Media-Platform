import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../index.js';


export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const reqLimit: number = 4;
    const timeWindowSeconds: number = 60
    console.log("Rate limit middleware triggered");
    const exists = await redisClient.exists('rate_limit_count');
    let count = 0;
    if (!exists) {
        count = await redisClient.incr('rate_limit_count');
        await redisClient.expire('rate_limit_count', timeWindowSeconds);
    } else {
        count = await redisClient.incr('rate_limit_count');
    }

    if (count > reqLimit) {
        return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    next();
};