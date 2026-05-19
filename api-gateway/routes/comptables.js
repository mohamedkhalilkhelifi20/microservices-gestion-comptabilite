'use strict';

const { Router }                     = require('express');
const { comptableClient, call }      = require('../grpc/grpcClients');

const router = Router();

router.post('/', async (req, res) => {
    try {
        const result = await call(comptableClient, 'createComptable', req.body);
        res.status(201).json(result.comptable);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await call(comptableClient, 'getAllComptables', {});
        res.json(result.comptables);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/specialite/:specialite', async (req, res) => {
    try {
        const result = await call(comptableClient, 'getComptablesBySpecialite', {
            specialite: req.params.specialite,
        });
        res.json(result.comptables);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await call(comptableClient, 'getComptable', { id: req.params.id });
        res.json(result.comptable);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

module.exports = router;
