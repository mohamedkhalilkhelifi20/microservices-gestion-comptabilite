'use strict';

const { GraphQLError } = require('graphql');

const {
    cabinetClient, comptableClient, clientClient, assignationClient,
    invoiceClient, declarationClient,
    alerteMS3Client, reportClient, statClient, auditClient,
    call,
} = require('../grpc/grpcClients');

function toGraphQLError(err) {
    const grpcCode = err?.code;
    const httpStatus =
        grpcCode === 5  ? 404 :
            grpcCode === 6  ? 409 :
                grpcCode === 9  ? 400 :
                    grpcCode === 14 ? 503 :
                        500;

    throw new GraphQLError(err.message, {
        extensions: {
            code:       err.code ?? 'INTERNAL_SERVER_ERROR',
            httpStatus,
            grpcCode,
        },
    });
}

const resolvers = {

    Query: {
        // Cabinet
        cabinet:  (_, { id }) =>
            call(cabinetClient, 'getCabinet', { id }).then(r => r.cabinet),
        cabinets: () =>
            call(cabinetClient, 'getAllCabinets', {}).then(r => r.cabinets),

        // Comptable
        comptable: (_, { id }) =>
            call(comptableClient, 'getComptable', { id }).then(r => r.comptable),
        comptables: () =>
            call(comptableClient, 'getAllComptables', {}).then(r => r.comptables),
        comptablesBySpecialite: (_, { specialite }) =>
            call(comptableClient, 'getComptablesBySpecialite', { specialite })
                .then(r => r.comptables),

        // Client
        client:  (_, { id }) =>
            call(clientClient, 'getClient', { id }).then(r => r.client),
        clients: () =>
            call(clientClient, 'getAllClients', {}).then(r => r.clients),

        // Assignation
        assignationsByClient: (_, { client_id }) =>
            call(assignationClient, 'getAssignationsByClient', { client_id })
                .then(r => r.assignations),

        // Invoice
        invoice: (_, { id }) =>
            call(invoiceClient, 'getInvoice', { id }).then(r => r.invoice),
        invoices: () =>
            call(invoiceClient, 'getAllInvoices', {}).then(r => r.invoices),
        invoicesByClient: (_, { client_id }) =>
            call(invoiceClient, 'getClientInvoices', { client_id })
                .then(r => r.invoices),

        // Declaration
        declaration: (_, { id }) =>
            call(declarationClient, 'getDeclaration', { id }).then(r => r.declaration),
        declarations: () =>
            call(declarationClient, 'getAllDeclarations', {}).then(r => r.declarations),
        declarationsByClient: (_, { client_id }) =>
            call(declarationClient, 'getClientDeclarations', { client_id })
                .then(r => r.declarations),

        // Alertes
        alertes: () =>
            call(alerteMS3Client, 'getAllAlertes', {}).then(r => r.alertes),
        alertesByClient: (_, { client_id }) =>
            call(alerteMS3Client, 'getAlertes', { client_id }).then(r => r.alertes),

        //  Reports
        report: (_, { id }) =>
            call(reportClient, 'getReport', { id }).then(r => r.report),
        reports: () =>
            call(reportClient, 'getAllReports', {}).then(r => r.reports),
        reportsByClient: (_, { client_id }) =>
            call(reportClient, 'getReportsByClient', { client_id })
                .then(r => r.reports),

        //  Stats
        stat: (_, { id }) =>
            call(statClient, 'getStat', { id }).then(r => r.stat),
        stats: () =>
            call(statClient, 'getAllStats', {}).then(r => r.stats),
        statsByClient: (_, { client_id }) =>
            call(statClient, 'getStatsByClient', { client_id }).then(r => r.stats),

        //  Audit
        auditLogs: () =>
            call(auditClient, 'getAllAuditLogs', {}).then(r => r.audit_logs),
        auditLogsByClient: (_, { client_id }) =>
            call(auditClient, 'getAuditLogsByClient', { client_id })
                .then(r => r.audit_logs),
        auditLogsByEntity: (_, { entity_type, entity_id }) =>
            call(auditClient, 'getAuditLogsByEntity', { entity_type, entity_id })
                .then(r => r.audit_logs),

        // Dashboard
        dashboard: async (_, { client_id }) => {
            const [statsRes, alertesRes, reportsRes, auditRes] = await Promise.all([
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

        // Cabinet
        createCabinet: async (_, args) => {
            try {
                return (await call(cabinetClient, 'createCabinet', args)).cabinet;
            } catch (err) { toGraphQLError(err); }
        },

        //  Comptable
        createComptable: async (_, args) => {
            try {
                return (await call(comptableClient, 'createComptable', args)).comptable;
            } catch (err) { toGraphQLError(err); }
        },

        // Client
        createClient: async (_, args) => {
            try {
                return (await call(clientClient, 'createClient', args)).client;
            } catch (err) { toGraphQLError(err); }
        },

        // Assignation
        assignComptableToClient: async (_, args) => {
            try {
                return (await call(assignationClient, 'assignComptableToClient', args))
                    .assignation;
            } catch (err) { toGraphQLError(err); }
        },

        // Invoice
        createInvoice: async (_, args) => {
            try {
                return (await call(invoiceClient, 'createInvoice', args)).invoice;
            } catch (err) { toGraphQLError(err); }
        },

        updateInvoice: async (_, { invoice_id, montant_ht, tva_rate, details_json, statut }) => {
            try {
                return (await call(invoiceClient, 'updateInvoice', {
                    invoice_id,
                    montant_ht:   montant_ht   || 0,
                    tva_rate:     tva_rate     || 0,
                    details_json: details_json || '',
                    statut:       statut       || '',
                })).invoice;
            } catch (err) { toGraphQLError(err); }
        },

        deleteInvoice: async (_, { invoice_id }) => {
            try {
                return await call(invoiceClient, 'deleteInvoice', { invoice_id });
            } catch (err) { toGraphQLError(err); }
        },

        signInvoice: async (_, { invoice_id, comptable_id }) => {
            try {
                return await call(invoiceClient, 'signInvoice', { invoice_id, comptable_id });
            } catch (err) { toGraphQLError(err); }
        },

        //Declaration
        createDeclaration: async (_, args) => {
            try {
                return (await call(declarationClient, 'createDeclaration', args)).declaration;
            } catch (err) { toGraphQLError(err); }
        },

        updateDeclaration: async (_, { declaration_id, montant, periode }) => {
            try {
                return (await call(declarationClient, 'updateDeclaration', {
                    declaration_id,
                    montant: montant || 0,
                    periode: periode || '',
                })).declaration;
            } catch (err) { toGraphQLError(err); }
        },

        deleteDeclaration: async (_, { declaration_id }) => {
            try {
                return await call(declarationClient, 'deleteDeclaration', { declaration_id });
            } catch (err) { toGraphQLError(err); }
        },

        validateDeclaration: async (_, { declaration_id, comptable_id }) => {
            try {
                return (await call(declarationClient, 'validateDeclaration', {
                    declaration_id,
                    comptable_id,
                })).declaration;
            } catch (err) { toGraphQLError(err); }
        },

        //Alerte
        createAlerte: async (_, args) => {
            try {
                return (await call(alerteMS3Client, 'createAlerte', args)).alerte;
            } catch (err) { toGraphQLError(err); }
        },

        //Report
        createReport: async (_, args) => {
            try {
                return (await call(reportClient, 'createReport', args)).report;
            } catch (err) { toGraphQLError(err); }
        },

        updateReport: async (_, { id, statut, contenu }) => {
            try {
                return (await call(reportClient, 'updateReport', {
                    id,
                    statut:  statut  || '',
                    contenu: contenu || '',
                })).report;
            } catch (err) { toGraphQLError(err); }
        },

        deleteReport: async (_, { id }) => {
            try {
                return await call(reportClient, 'deleteReport', { id });
            } catch (err) { toGraphQLError(err); }
        },
    },
};

module.exports = resolvers;
