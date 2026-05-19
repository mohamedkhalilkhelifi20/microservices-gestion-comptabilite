'use strict';

const alerteService = require('../services/alerteService');
const reportService = require('../services/reportService');
const statService   = require('../services/statService');
const auditService  = require('../services/auditService');


async function createAlerte(call, callback) {
    try {
        const alerte = await alerteService.createAlerte(call.request);
        callback(null, { alerte });
    } catch (err) {
        console.error('[MS3][Handler] createAlerte error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getAlertes(call, callback) {
    try {
        const alertes = await alerteService.getAlertes(call.request);
        callback(null, { alertes });
    } catch (err) {
        console.error('[MS3][Handler] getAlertes error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getAllAlertes(call, callback) {
    try {
        const alertes = await alerteService.getAllAlertes();
        callback(null, { alertes });
    } catch (err) {
        console.error('[MS3][Handler] getAllAlertes error:', err.message);
        callback({ code: 13, message: err.message });
    }
}


async function createReport(call, callback) {
    try {
        const report = await reportService.createReport(call.request);
        callback(null, { report });
    } catch (err) {
        console.error('[MS3][Handler] createReport error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getReport(call, callback) {
    try {
        const report = await reportService.getReport(call.request);
        callback(null, { report });
    } catch (err) {
        console.error('[MS3][Handler] getReport error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getReportsByClient(call, callback) {
    try {
        const reports = await reportService.getReportsByClient(call.request);
        callback(null, { reports });
    } catch (err) {
        console.error('[MS3][Handler] getReportsByClient error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getAllReports(call, callback) {
    try {
        const reports = await reportService.getAllReports();
        callback(null, { reports });
    } catch (err) {
        console.error('[MS3][Handler] getAllReports error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function updateReport(call, callback) {
    try {
        const report = await reportService.updateReport(call.request);
        callback(null, { report });
    } catch (err) {
        console.error('[MS3][Handler] updateReport error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function deleteReport(call, callback) {
    try {
        const result = await reportService.deleteReport(call.request);
        callback(null, result);
    } catch (err) {
        console.error('[MS3][Handler] deleteReport error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

// Stat Handlers

async function getStat(call, callback) {
    try {
        const stat = await statService.getStat(call.request);
        callback(null, { stat });
    } catch (err) {
        console.error('[MS3][Handler] getStat error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getStatsByClient(call, callback) {
    try {
        const stats = await statService.getStatsByClient(call.request);
        callback(null, { stats });
    } catch (err) {
        console.error('[MS3][Handler] getStatsByClient error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getAllStats(call, callback) {
    try {
        const stats = await statService.getAllStats();
        callback(null, { stats });
    } catch (err) {
        console.error('[MS3][Handler] getAllStats error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

//Audit Handlers

async function getAuditLogsByClient(call, callback) {
    try {
        const audit_logs = await auditService.getAuditLogsByClient(call.request);
        callback(null, { audit_logs });
    } catch (err) {
        console.error('[MS3][Handler] getAuditLogsByClient error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getAuditLogsByEntity(call, callback) {
    try {
        const audit_logs = await auditService.getAuditLogsByEntity(call.request);
        callback(null, { audit_logs });
    } catch (err) {
        console.error('[MS3][Handler] getAuditLogsByEntity error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

async function getAllAuditLogs(call, callback) {
    try {
        const audit_logs = await auditService.getAllAuditLogs();
        callback(null, { audit_logs });
    } catch (err) {
        console.error('[MS3][Handler] getAllAuditLogs error:', err.message);
        callback({ code: 13, message: err.message });
    }
}

module.exports = {
    createAlerte,
    getAlertes,
    getAllAlertes,
    createReport,
    getReport,
    getReportsByClient,
    getAllReports,
    updateReport,
    deleteReport,
    getStat,
    getStatsByClient,
    getAllStats,
    getAuditLogsByClient,
    getAuditLogsByEntity,
    getAllAuditLogs,
};
