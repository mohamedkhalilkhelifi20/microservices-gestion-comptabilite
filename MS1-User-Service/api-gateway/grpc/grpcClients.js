'use strict';

const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_DIR = path.join(__dirname, '..', '..', 'proto');
const MS1_ADDR  = process.env.MS1_ADDR || 'localhost:50051';

const OPTS = {
    keepCase:    true,
    longs:       String,
    enums:       String,
    defaults:    true,
    oneofs:      true,
    includeDirs: [PROTO_DIR],
};

function loadClient(protoFile, packageName, serviceName) {
    const pkg = grpc.loadPackageDefinition(
        protoLoader.loadSync(path.join(PROTO_DIR, protoFile), OPTS)
    )[packageName];
    return new pkg[serviceName](MS1_ADDR, grpc.credentials.createInsecure());
}

const cabinetClient     = loadClient('cabinet.proto',     'cabinet',     'CabinetService');
const comptableClient   = loadClient('comptable.proto',   'comptable',   'ComptableService');
const clientClient      = loadClient('client.proto',      'client',      'ClientService');
const assignationClient = loadClient('assignation.proto', 'assignation', 'AssignationService');

function call(client, method, request = {}) {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) reject(err);
            else     resolve(response);
        });
    });
}

module.exports = { cabinetClient, comptableClient, clientClient, assignationClient, call };
