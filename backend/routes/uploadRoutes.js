import express from 'express';
import multer from 'multer';
import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import {promisify} from 'util';
import {pipeline} from 'stream';
import {fileURLToPath} from 'url';
import path from 'path';

const asyncPipeline = promisify(pipeline);
const router = express.Router();
const upload = multer();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post(
    '/resume',
    upload.single('file'),
    (req, res) => {
        const {file} = req;

        if (!['.pdf'].includes(file?.detectedFileExtension)) {
            res.status(400)
                .json({
                    message: 'Неверный формат',
                });
        } else {
            const filename = `${uuidv4()}${file?.detectedFileExtension}`;

            asyncPipeline(file?.stream, fs.createWriteStream(`${__dirname}/../public/resume/${filename}`))
                .then(() => {
                    res.send({
                        message: 'Файл успешно загружен',
                        url: `/host/resume/${filename}`,
                    });
                })
                .catch((err) => {
                    res.status(400)
                        .json({
                            message: 'Ошибка при загрузке',
                            description: err,
                        });
                });
        }
    });

router.post(
    '/profile',
    upload.single('file'),
    (req, res) => {
        const {file} = req;

        if (!['.jpg', '.png'].includes(file?.detectedFileExtension)) {
            res.status(400)
                .json({
                    message: 'Неверный формат',
                });
        } else {
            const filename = `${uuidv4()}${file?.detectedFileExtension}`;

            asyncPipeline(file.stream, fs.createWriteStream(`${__dirname}/../public/profile/${filename}`))
                .then(() => {
                    res.send({
                        message: 'Фотография профиля успешно загружена',
                        url: `/host/profile/${filename}`,
                    });
                })
                .catch((err) => {
                    res.status(400)
                        .json({
                            message: 'Ошибка при загрузке',
                            description: err,
                        });
                });
        }
    });

export default router;
