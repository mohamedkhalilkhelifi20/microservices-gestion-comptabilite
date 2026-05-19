'use strict';

const { Router } = require('express');
const {
    alerteMS3Client,
    reportClient,
    statClient,
    auditClient,
    call,
} = require('../grpc/grpcClients');

const router = Router();

//Alertes

router.post('/alertes', async (req, res) => {
    try {
        const result = await call(alerteMS3Client, 'createAlerte', req.body);
        res.status(201).json(result.alerte);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/alertes', async (req, res) => {
    try {
        const result = await call(alerteMS3Client, 'getAllAlertes', {});
        res.json(result.alertes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/alertes/client/:client_id', async (req, res) => {
    try {
        const result = await call(alerteMS3Client, 'getAlertes', {
            client_id: req.params.client_id,
        });
        res.json(result.alertes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Reports

router.post('/reports', async (req, res) => {
    try {
        const result = await call(reportClient, 'createReport', req.body);
        res.status(201).json(result.report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reports', async (req, res) => {
    try {
        const result = await call(reportClient, 'getAllReports', {});
        res.json(result.reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reports/client/:client_id', async (req, res) => {
    try {
        const result = await call(reportClient, 'getReportsByClient', {
            client_id: req.params.client_id,
        });
        res.json(result.reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reports/:id', async (req, res) => {
    try {
        const result = await call(reportClient, 'getReport', { id: req.params.id });
        res.json(result.report);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

router.put('/reports/:id', async (req, res) => {
    try {
        const result = await call(reportClient, 'updateReport', {
            id: req.params.id,
            ...req.body,
        });
        res.json(result.report);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

router.delete('/reports/:id', async (req, res) => {
    try {
        const result = await call(reportClient, 'deleteReport', { id: req.params.id });
        res.json(result);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

// Stats

router.get('/stats', async (req, res) => {
    try {
        const result = await call(statClient, 'getAllStats', {});
        res.json(result.stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/stats/client/:client_id', async (req, res) => {
    try {
        const result = await call(statClient, 'getStatsByClient', {
            client_id: req.params.client_id,
        });
        res.json(result.stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/stats/:id', async (req, res) => {
    try {
        const result = await call(statClient, 'getStat', { id: req.params.id });
        res.json(result.stat);
    } catch (err) {
        const code = err.code === 5 ? 404 : 500;
        res.status(code).json({ error: err.message });
    }
});

//Audit

router.get('/audit', async (req, res) => {
    try {
        const result = await call(auditClient, 'getAllAuditLogs', {});
        res.json(result.audit_logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/audit/client/:client_id', async (req, res) => {
    try {
        const result = await call(auditClient, 'getAuditLogsByClient', {
            client_id: req.params.client_id,
        });
        res.json(result.audit_logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/audit/entity/:entity_type/:entity_id', async (req, res) => {
    try {
        const result = await call(auditClient, 'getAuditLogsByEntity', {
            entity_type: req.params.entity_type,
            entity_id:   req.params.entity_id,
        });
        res.json(result.audit_logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Dashboard — agrégation MS3

router.get('/dashboard/:client_id', async (req, res) => {
    try {
        const { client_id } = req.params;

        const [statsRes, alertesRes, reportsRes, auditRes] = await Promise.all([
            call(statClient,      'getStatsByClient',      { client_id }),
            call(alerteMS3Client, 'getAlertes',            { client_id }),
            call(reportClient,    'getReportsByClient',    { client_id }),
            call(auditClient,     'getAuditLogsByClient',  { client_id }),
        ]);

        res.json({
            client_id,
            stats:      statsRes.stats,
            alertes:    alertesRes.alertes,
            reports:    reportsRes.reports,
            audit_logs: auditRes.audit_logs,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
