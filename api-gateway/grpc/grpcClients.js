'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_MS1 = path.join(__dirname, '..', 'ms1-user-service',      'proto');
const PROTO_MS2 = path.join(__dirname, '..', 'ms2-document-service',  'proto');
const PROTO_MS3 = path.join(__dirname, '..', 'ms3-analytics-service', 'proto');

const MS1_ADDR = process.env.MS1_ADDR || 'localhost:50051';
const MS2_ADDR = process.env.MS2_ADDR || 'localhost:50052';
const MS3_ADDR = process.env.MS3_ADDR || 'localhost:50053';

function loadClient(protoDir, protoFile, packageName, serviceName, addr) {
    const pkg = grpc.loadPackageDefinition(
        protoLoader.loadSync(path.join(protoDir, protoFile), {
            keepCase:    true,
            longs:       String,
            enums:       String,
            defaults:    true,
            oneofs:      true,
            includeDirs: [protoDir],
        })
    )[packageName];
    return new pkg[serviceName](addr, grpc.credentials.createInsecure());
}

const cabinetClient     = loadClient(PROTO_MS1, 'cabinet.proto',     'cabinet',     'CabinetService',     MS1_ADDR);
const comptableClient   = loadClient(PROTO_MS1, 'comptable.proto',   'comptable',   'ComptableService',   MS1_ADDR);
const clientClient      = loadClient(PROTO_MS1, 'client.proto',      'client',      'ClientService',      MS1_ADDR);
const assignationClient = loadClient(PROTO_MS1, 'assignation.proto', 'assignation', 'AssignationService', MS1_ADDR);


const invoiceClient     = loadClient(PROTO_MS2, 'invoice.proto',     'invoice',     'InvoiceService',     MS2_ADDR);
const declarationClient = loadClient(PROTO_MS2, 'declaration.proto', 'declaration', 'DeclarationService', MS2_ADDR);


const alerteMS3Client   = loadClient(PROTO_MS3, 'alerte.proto',      'alerte',      'AlerteService',      MS3_ADDR);
const reportClient      = loadClient(PROTO_MS3, 'report.proto',      'report',      'ReportService',      MS3_ADDR);
const statClient        = loadClient(PROTO_MS3, 'stat.proto',        'stat',        'StatService',        MS3_ADDR);
const auditClient       = loadClient(PROTO_MS3, 'audit.proto',       'audit',       'AuditService',       MS3_ADDR);

// Helper générique
function call(client, method, request = {}) {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) reject(err);
            else     resolve(response);
        });
    });
}

module.exports = {
    cabinetClient, comptableClient, clientClient, assignationClient,
    invoiceClient, declarationClient,
    alerteMS3Client, reportClient, statClient, auditClient,
    call,
};
