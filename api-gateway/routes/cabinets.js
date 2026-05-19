'use strict';

const { Router }                       = require('express');
const { cabinetClient, call }          = require('../grpc/grpcClients');

const router = Router();

router.post('/', async (req, res) => {
    try {
        const result = await call(cabinetClient, 'createCabinet', req.body);
        res.status(201).json(result.cabinet);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await call(cabinetClient, 'getAllCabinets', {});
        res.json(result.cabinets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await call(cabinetClient, 'getCabinet', { id: req.params.id });
        res.json(result.cabinet);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

module.exports = router;
