'use strict';

const { Router }                  = require('express');
const { clientClient, call }      = require('../grpc/grpcClients');

const router = Router();

router.post('/', async (req, res) => {
    try {
        const result = await call(clientClient, 'createClient', req.body);
        res.status(201).json(result.client);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await call(clientClient, 'getAllClients', {});
        res.json(result.clients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await call(clientClient, 'getClient', { id: req.params.id });
        res.json(result.client);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

module.exports = router;
