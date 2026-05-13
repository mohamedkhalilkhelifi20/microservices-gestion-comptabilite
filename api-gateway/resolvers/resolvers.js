'use strict';

const {
    cabinetClient, comptableClient, clientClient, assignationClient,
    invoiceClient, declarationClient,
    alerteMS3Client, reportClient, statClient, auditClient,
    call,
} = require('../grpc/grpcClients');

const resolvers = {

    Query: {
        //Cabinet
        cabinet:  (_, { id }) =>
            call(cabinetClient, 'getCabinet', { id }).then(r => r.cabinet),
        cabinets: () =>
            call(cabinetClient, 'getAllCabinets', {}).then(r => r.cabinets),

        //Comptable
        comptable: (_, { id }) =>
            call(comptableClient, 'getComptable', { id }).then(r => r.comptable),
        comptables: () =>
            call(comptableClient, 'getAllComptables', {}).then(r => r.comptables),
        comptablesBySpecialite: (_, { specialite }) =>
            call(comptableClient, 'getComptablesBySpecialite', { specialite }).then(r => r.comptables),

        //Client
        client:  (_, { id }) =>
            call(clientClient, 'getClient', { id }).then(r => r.client),
        clients: () =>
            call(clientClient, 'getAllClients', {}).then(r => r.clients),

        //  Assignation
        assignationsByClient: (_, { client_id }) =>
            call(assignationClient, 'getAssignationsByClient', { client_id }).then(r => r.assignations),

        //Invoice
        invoice: (_, { id }) =>
            call(invoiceClient, 'getInvoice', { id }).then(r => r.invoice),
        invoices: () =>
            call(invoiceClient, 'getAllInvoices', {}).then(r => r.invoices),
        invoicesByClient: (_, { client_id }) =>
            call(invoiceClient, 'getClientInvoices', { client_id }).then(r => r.invoices),

        //Declaration
        declaration: (_, { id }) =>
            call(declarationClient, 'getDeclaration', { id }).then(r => r.declaration),
        declarations: () =>
            call(declarationClient, 'getAllDeclarations', {}).then(r => r.declarations),
        declarationsByClient: (_, { client_id }) =>
            call(declarationClient, 'getClientDeclarations', { client_id }).then(r => r.declarations),

        //Alertes
        alertes: () =>
            call(alerteMS3Client, 'getAllAlertes', {}).then(r => r.alertes),
        alertesByClient: (_, { client_id }) =>
            call(alerteMS3Client, 'getAlertes', { client_id }).then(r => r.alertes),

        // Reports
        report: (_, { id }) =>
            call(reportClient, 'getReport', { id }).then(r => r.report),
        reports: () =>
            call(reportClient, 'getAllReports', {}).then(r => r.reports),
        reportsByClient: (_, { client_id }) =>
            call(reportClient, 'getReportsByClient', { client_id }).then(r => r.reports),

        // Stats
        stat: (_, { id }) =>
            call(statClient, 'getStat', { id }).then(r => r.stat),
        stats: () =>
            call(statClient, 'getAllStats', {}).then(r => r.stats),
        statsByClient: (_, { client_id }) =>
            call(statClient, 'getStatsByClient', { client_id }).then(r => r.stats),

        //Audit
        auditLogs: () =>
            call(auditClient, 'getAllAuditLogs', {}).then(r => r.audit_logs),
        auditLogsByClient: (_, { client_id }) =>
            call(auditClient, 'getAuditLogsByClient', { client_id }).then(r => r.audit_logs),
        auditLogsByEntity: (_, { entity_type, entity_id }) =>
            call(auditClient, 'getAuditLogsByEntity', { entity_type, entity_id }).then(r => r.audit_logs),

        //Dashboard
        dashboard: async (_, { client_id }) => {
            const [statsRes, alertesRes, reportsRes, auditRes] =
                await Promise.all([
                call(statClient,      'getStatsByClient',     { client_id }),
                call(alerteMS3Client, 'getAlertes',           { client_id }),
                call(reportClient,    'getReportsByClient',   { client_id }),
                call(auditClient,     'getAuditLogsByClient', { client_id }),
            ]);
            return {
                client_id,
                stats:      statsRes.stats,
                alertes:    alertesRes.alertes,
                reports:    reportsRes.reports,
                audit_logs: auditRes.audit_logs,
            };
        },
    },

    Mutation: {
        //Cabinet
        createCabinet: (_, args) =>
            call(cabinetClient, 'createCabinet', args).then(r => r.cabinet),

        //Comptable
        createComptable: (_, args) =>
            call(comptableClient, 'createComptable', args).then(r => r.comptable),

        //Client
        createClient: (_, args) =>
            call(clientClient, 'createClient', args).then(r => r.client),

        //Assignation
        assignComptableToClient: (_, args) =>
            call(assignationClient, 'assignComptableToClient', args),

        //Invoice
        createInvoice: (_, args) =>
            call(invoiceClient, 'createInvoice', args).then(r => r.invoice),

        updateInvoice: (_, { invoice_id, montant_ht, tva_rate, details_json, statut }) =>
            call(invoiceClient, 'updateInvoice', {
                invoice_id,
                montant_ht:   montant_ht   || 0,
                tva_rate:     tva_rate     || 0,
                details_json: details_json || '',
                statut:       statut       || '',
            }).then(r => r.invoice),

        deleteInvoice: (_, { invoice_id }) =>
            call(invoiceClient, 'deleteInvoice', { invoice_id }),

        signInvoice: (_, { invoice_id, comptable_id }) =>
            call(invoiceClient, 'signInvoice', { invoice_id, comptable_id }),

        //Declaration
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

        //Alerte
        createAlerte: (_, args) =>
            call(alerteMS3Client, 'createAlerte', args).then(r => r.alerte),

        //Report
        createReport: (_, args) =>
            call(reportClient, 'createReport', args).then(r => r.report),

        updateReport: (_, { id, statut, contenu }) =>
            call(reportClient, 'updateReport', {
                id,
                statut:  statut  || '',
                contenu: contenu || '',
            }).then(r => r.report),

        deleteReport: (_, { id }) =>
            call(reportClient, 'deleteReport', { id }),
    },
};

module.exports = resolvers;
