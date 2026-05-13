'use strict';

const { Router } = require('express');
const { invoiceClient, declarationClient, alerteClient, call } = require('../grpc/grpcClients');

const router = Router();


//  FACTURES
// POST /api/invoices
router.post('/', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'createInvoice', req.body);
        res.status(201).json(result.invoice);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

// GET /api/invoices
router.get('/', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'getAllInvoices', {});
        res.json(result.invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/client/:client_id
router.get('/client/:client_id', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'getClientInvoices', {
            client_id: req.params.client_id,
        });
        res.json(result.invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'getInvoice', { id: req.params.id });
        res.json(result.invoice);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

// PUT /api/invoices/:id — modifier (brouillon seulement)
router.put('/:id', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'updateInvoice', {
            invoice_id:   req.params.id,
            montant_ht:   req.body.montant_ht   || 0,
            tva_rate:     req.body.tva_rate     || 0,
            details_json: req.body.details_json || '',
        });
        res.json(result.invoice);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

// DELETE /api/invoices/:id — supprimer (brouillon seulement)
router.delete('/:id', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'deleteInvoice', {
            invoice_id: req.params.id,
        });
        res.json(result);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

// PUT /api/invoices/:id/sign — signer
router.put('/:id/sign', async (req, res) => {
    try {
        const result = await call(invoiceClient, 'signInvoice', {
            invoice_id:   req.params.id,
            comptable_id: req.body.comptable_id,
        });
        res.json(result);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});


//  DÉCLARATIONS
// POST /api/invoices/declarations
router.post('/declarations', async (req, res) => {
    try {
        const result = await call(declarationClient, 'createDeclaration', req.body);
        res.status(201).json(result.declaration);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

// GET /api/invoices/declarations
router.get('/declarations', async (req, res) => {
    try {
        const result = await call(declarationClient, 'getAllDeclarations', {});
        res.json(result.declarations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/declarations/client/:client_id
router.get('/declarations/client/:client_id', async (req, res) => {
    try {
        const result = await call(declarationClient, 'getClientDeclarations', {
            client_id: req.params.client_id,
        });
        res.json(result.declarations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/declarations/:id
router.get('/declarations/:id', async (req, res) => {
    try {
        const result = await call(declarationClient, 'getDeclaration', { id: req.params.id });
        res.json(result.declaration);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

// PUT /api/invoices/declarations/:id — modifier (brouillon seulement)
router.put('/declarations/:id', async (req, res) => {
    try {
        const result = await call(declarationClient, 'updateDeclaration', {
            declaration_id: req.params.id,
            montant:        req.body.montant || 0,
            periode:        req.body.periode || '',
        });
        res.json(result.declaration);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

// DELETE /api/invoices/declarations/:id — supprimer (brouillon seulement)
router.delete('/declarations/:id', async (req, res) => {
    try {
        const result = await call(declarationClient, 'deleteDeclaration', {
            declaration_id: req.params.id,
        });
        res.json(result);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

// PUT /api/invoices/declarations/:id/validate — valider
router.put('/declarations/:id/validate', async (req, res) => {
    try {
        const result = await call(declarationClient, 'validateDeclaration', {
            declaration_id: req.params.id,
            comptable_id:   req.body.comptable_id,
        });
        res.json(result.declaration);
    } catch (err) {
        const code = err.code === 5 ? 404 : err.code === 9 ? 400 : 500;
        res.status(code).json({ error: err.message });
    }
});

//  ALERTES

// POST /api/invoices/alertes
router.post('/alertes', async (req, res) => {
    try {
        const result = await call(alerteClient, 'createAlerte', req.body);
        res.status(201).json(result.alerte);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

// GET /api/invoices/alertes
router.get('/alertes', async (req, res) => {
    try {
        const result = await call(alerteClient, 'getAllAlertes', {});
        res.json(result.alertes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/alertes/client/:client_id
router.get('/alertes/client/:client_id', async (req, res) => {
    try {
        const result = await call(alerteClient, 'getAlertes', {
            client_id: req.params.client_id,
        });
        res.json(result.alertes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
