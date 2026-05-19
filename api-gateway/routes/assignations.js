'use strict';

const { Router }                      = require('express');
const { assignationClient, call }     = require('../grpc/grpcClients');

const router = Router();

router.post('/', async (req, res) => {
    try {
        const result = await call(assignationClient, 'assignComptableToClient', req.body);
        res.status(201).json(result);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

router.get('/client/:client_id', async (req, res) => {
    try {
        const result = await call(assignationClient, 'getAssignationsByClient', {
            client_id: req.params.client_id,
        });
        res.json(result.assignations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
