'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

// Helpers

function now() {
    return new Date().toISOString();
}

// Service

async function createReport({ client_id, type, periode, contenu = '{}' }) {
    const db = await initDatabase();

    const doc = {
        id:         uuidv4(),
        client_id,
        type,
        periode,
        statut:     'genere',
        contenu,
        created_at: now(),
    };

    await db.reports.insert(doc);

    const rxDoc = await db.reports.findOne(doc.id).exec();
    console.log(`[MS3][ReportService] Rapport créé → ${doc.id} | type: ${type} | periode: ${periode}`);
    return rxDoc.toJSON();
}

async function getReport({ id }) {
    const db    = await initDatabase();
    const rxDoc = await db.reports.findOne(id).exec();
    if (!rxDoc) throw new Error(`Rapport introuvable : ${id}`);
    return rxDoc.toJSON();
}

async function getReportsByClient({ client_id }) {
    const db      = await initDatabase();
    const results = await db.reports.find({
        selector: { client_id },
    }).exec();
    return results.map(d => d.toJSON());
}

async function getAllReports() {
    const db      = await initDatabase();
    const results = await db.reports.find().exec();
    return results.map(d => d.toJSON());
}

async function updateReport({ id, statut, contenu }) {
    const db    = await initDatabase();
    const rxDoc = await db.reports.findOne(id).exec();
    if (!rxDoc) throw new Error(`Rapport introuvable : ${id}`);

    const patch = {};
    if (statut)  patch.statut  = statut;
    if (contenu) patch.contenu = contenu;

    await rxDoc.patch(patch);

    const updated = await db.reports.findOne(id).exec();
    console.log(`[MS3][ReportService] Rapport mis à jour → ${id} | statut: ${statut}`);
    return updated.toJSON();
}

async function deleteReport({ id }) {
    const db    = await initDatabase();
    const rxDoc = await db.reports.findOne(id).exec();
    if (!rxDoc) throw new Error(`Rapport introuvable : ${id}`);

    await rxDoc.remove();
    console.log(`[MS3][ReportService] Rapport supprimé → ${id}`);
    return { success: true, message: `Rapport ${id} supprimé avec succès` };
}

//Exports

module.exports = {
    createReport,
    getReport,
    getReportsByClient,
    getAllReports,
    updateReport,
    deleteReport,
};
