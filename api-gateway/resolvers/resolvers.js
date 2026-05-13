'use strict';

const {
    cabinetClient, comptableClient, clientClient, assignationClient,
    invoiceClient, declarationClient, alerteClient,
    call,
} = require('../grpc/grpcClients');

const resolvers = {

    Query: {
        // ── MS1 — Cabinet ─────────────────────────────
        cabinet:  (_, { id }) =>
            call(cabinetClient, 'getCabinet', { id }).then(r => r.cabinet),
        cabinets: () =>
            call(cabinetClient, 'getAllCabinets', {}).then(r => r.cabinets),

        // ── MS1 — Comptable ───────────────────────────
        comptable: (_, { id }) =>
            call(comptableClient, 'getComptable', { id }).then(r => r.comptable),
        comptables: () =>
            call(comptableClient, 'getAllComptables', {}).then(r => r.comptables),
        comptablesBySpecialite: (_, { specialite }) =>
            call(comptableClient, 'getComptablesBySpecialite', { specialite }).then(r => r.comptables),

        // ── MS1 — Client ──────────────────────────────
        client:  (_, { id }) =>
            call(clientClient, 'getClient', { id }).then(r => r.client),
        clients: () =>
            call(clientClient, 'getAllClients', {}).then(r => r.clients),

        // ── MS1 — Assignation ─────────────────────────
        assignationsByClient: (_, { client_id }) =>
            call(assignationClient, 'getAssignationsByClient', { client_id }).then(r => r.assignations),

        // ── MS2 — Invoice ─────────────────────────────
        invoice: (_, { id }) =>
            call(invoiceClient, 'getInvoice', { id }).then(r => r.invoice),
        invoices: () =>
            call(invoiceClient, 'getAllInvoices', {}).then(r => r.invoices),
        invoicesByClient: (_, { client_id }) =>
            call(invoiceClient, 'getClientInvoices', { client_id }).then(r => r.invoices),

        // ── MS2 — Declaration ─────────────────────────
        declaration: (_, { id }) =>
            call(declarationClient, 'getDeclaration', { id }).then(r => r.declaration),
        declarations: () =>
            call(declarationClient, 'getAllDeclarations', {}).then(r => r.declarations),
        declarationsByClient: (_, { client_id }) =>
            call(declarationClient, 'getClientDeclarations', { client_id }).then(r => r.declarations),

        // ── MS2 — Alerte ──────────────────────────────
        alertes: () =>
            call(alerteClient, 'getAllAlertes', {}).then(r => r.alertes),
        alertesByClient: (_, { client_id }) =>
            call(alerteClient, 'getAlertes', { client_id }).then(r => r.alertes),
    },

    Mutation: {
        // ── MS1 — Cabinet ─────────────────────────────
        createCabinet: (_, args) =>
            call(cabinetClient, 'createCabinet', args).then(r => r.cabinet),

        // ── MS1 — Comptable ───────────────────────────
        createComptable: (_, args) =>
            call(comptableClient, 'createComptable', args).then(r => r.comptable),

        // ── MS1 — Client ──────────────────────────────
        createClient: (_, args) =>
            call(clientClient, 'createClient', args).then(r => r.client),

        // ── MS1 — Assignation ─────────────────────────
        assignComptableToClient: (_, args) =>
            call(assignationClient, 'assignComptableToClient', args),

        // ── MS2 — Invoice ─────────────────────────────
        createInvoice: (_, args) =>
            call(invoiceClient, 'createInvoice', args).then(r => r.invoice),

        updateInvoice: (_, { invoice_id, montant_ht, tva_rate, details_json, statut }) =>
            call(invoiceClient, 'updateInvoice', {
                invoice_id,
                montant_ht:   montant_ht   || 0,
                tva_rate:     tva_rate     || 0,
                details_json: details_json || '',
                statut:       statut       || '',   // ← statut transmis au gRPC
            }).then(r => r.invoice),

        deleteInvoice: (_, { invoice_id }) =>
            call(invoiceClient, 'deleteInvoice', { invoice_id }),

        signInvoice: (_, { invoice_id, comptable_id }) =>
            call(invoiceClient, 'signInvoice', { invoice_id, comptable_id }),

        // ── MS2 — Declaration ─────────────────────────
        createDeclaration: (_, args) =>
            call(declarationClient, 'createDeclaration', args).then(r => r.declaration),

        updateDeclaration: (_, { declaration_id, montant, periode }) =>
            call(declarationClient, 'updateDeclaration', {
                declaration_id,
                montant: montant || 0,
                periode: periode || '',
            }).then(r => r.declaration),

        deleteDeclaration: (_, { declaration_id }) =>
            call(declarationClient, 'deleteDeclaration', { declaration_id }),

        validateDeclaration: (_, { declaration_id, comptable_id }) =>
            call(declarationClient, 'validateDeclaration', { declaration_id, comptable_id })
                .then(r => r.declaration),

        // ── MS2 — Alerte ──────────────────────────────
        createAlerte: (_, args) =>
            call(alerteClient, 'createAlerte', args).then(r => r.alerte),
    },
};

module.exports = resolvers;
