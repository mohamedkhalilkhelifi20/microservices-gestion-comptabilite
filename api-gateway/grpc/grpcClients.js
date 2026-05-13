'use strict';

const path= require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_MS1 = path.join(__dirname, '..', '..', 'ms1-user-service',     'proto');
const PROTO_MS2 = path.join(__dirname, '..', '..', 'ms2-document-service', 'proto');
const MS1_ADDR  = process.env.MS1_ADDR || 'localhost:50051';
const MS2_ADDR  = process.env.MS2_ADDR || 'localhost:50052';

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

//MS1
const cabinetClient = loadClient( PROTO_MS1,'cabinet.proto','cabinet', 'CabinetService',MS1_ADDR);
const comptableClient = loadClient( PROTO_MS1,'comptable.proto','comptable','ComptableService',MS1_ADDR);
const clientClient= loadClient( PROTO_MS1,'client.proto','client','ClientService',MS1_ADDR);
const assignationClient = loadClient( PROTO_MS1,'assignation.proto', 'assignation','AssignationService',MS1_ADDR);

//MS2
const invoiceClient = loadClient(PROTO_MS2,'invoice.proto','invoice','InvoiceService',MS2_ADDR);
const declarationClient = loadClient(PROTO_MS2,'declaration.proto', 'declaration', 'DeclarationService', MS2_ADDR);
const alerteClient= loadClient(PROTO_MS2,'alerte.proto', 'alerte', 'AlerteService', MS2_ADDR);

//Helper générique
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
    invoiceClient, declarationClient, alerteClient,
    call,
};

