'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const initDatabase              = require('./db/database');
const { startConsumer, disconnect: kafkaOff } = require('./kafka/consumer');
const handler                   = require('./handlers/analyticsHandlers');

const PORT      = process.env.MS3_PORT || '50053';
const PROTO_DIR = path.join(__dirname, 'proto');

// Proto Loader Options

const LOADER_OPTIONS = {
    keepCase:    true,
    longs:       String,
    enums:       String,
    defaults:    true,
    oneofs:      true,
    includeDirs: [PROTO_DIR],
};

// Load Packages

const alertePkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'alerte.proto'), LOADER_OPTIONS)
).alerte;

const reportPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'report.proto'), LOADER_OPTIONS)
).report;

const statPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'stat.proto'), LOADER_OPTIONS)
).stat;

const auditPkg = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(PROTO_DIR, 'audit.proto'), LOADER_OPTIONS)
).audit;

//Build gRPC Server

function buildServer() {
    const server = new grpc.Server();

    server.addService(alertePkg.AlerteService.service, {
        CreateAlerte:  handler.createAlerte,
        GetAlertes:    handler.getAlertes,
        GetAllAlertes: handler.getAllAlertes,
    });

    server.addService(reportPkg.ReportService.service, {
        CreateReport:       handler.createReport,
        GetReport:          handler.getReport,
        GetReportsByClient: handler.getReportsByClient,
        GetAllReports:      handler.getAllReports,
        UpdateReport:       handler.updateReport,
        DeleteReport:       handler.deleteReport,
    });

    server.addService(statPkg.StatService.service, {
        GetStat:          handler.getStat,
        GetStatsByClient: handler.getStatsByClient,
        GetAllStats:      handler.getAllStats,
    });

    server.addService(auditPkg.AuditService.service, {
        GetAuditLogsByClient: handler.getAuditLogsByClient,
        GetAuditLogsByEntity: handler.getAuditLogsByEntity,
        GetAllAuditLogs:      handler.getAllAuditLogs,
    });

    return server;
}

//Start

async function main() {
    try {
        // 1 — Init RxDB
        await initDatabase();

        // 2 — Start Kafka consumer
        await startConsumer();

        // 3 — Start gRPC server
        const server = buildServer();

        server.bindAsync(
            `0.0.0.0:${PORT}`,
            grpc.ServerCredentials.createInsecure(),
            (err, port) => {
                if (err) {
                    console.error('[MS3] Erreur démarrage gRPC:', err.message);
                    process.exit(1);
                }
                console.log(`[MS3] gRPC démarré sur port ${port}`);
            }
        );

        // 4 — Graceful shutdown
        process.on('SIGINT',  () => shutdown(server));
        process.on('SIGTERM', () => shutdown(server));

    } catch (err) {
        console.error('[MS3] Erreur démarrage:', err.message);
        process.exit(1);
    }
}

async function shutdown(server) {
    console.log('[MS3] Arrêt en cours...');
    await kafkaOff();
    server.forceShutdown();
    console.log('[MS3] Arrêt terminé');
    process.exit(0);
}

main();
