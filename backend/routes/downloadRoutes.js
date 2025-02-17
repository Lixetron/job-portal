import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.get('/resume/:file', (req, res) => {
    const address = path.join(__dirname, `../public/resume/${req.params.file}`);
    fs.access(address, fs.F_OK, (err) => {
        if (err) {
            res.status(404)
                .json({
                    message: 'File not found',
                });

            return;
        }

        res.sendFile(address);
    });
});

router.get('/profile/:file', (req, res) => {
    const address = path.join(__dirname, `../public/profile/${req.params.file}`);

    fs.access(address, fs.F_OK, (err) => {
        if (err) {
            res.status(404)
                .json({
                    message: 'File not found',
                });

            return;
        }

        res.sendFile(address);
    });
});

export default router;
