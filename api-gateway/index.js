'use strict';

const express      = require('express');
const cors         = require('cors');
const bodyParser   = require('body-parser');
const fs           = require('fs');
const path         = require('path');

const { ApolloServer }         = require('@apollo/server');
const { expressMiddleware }    = require('@as-integrations/express5');
const { buildSchema }          = require('graphql');
const { addResolversToSchema } = require('@graphql-tools/schema');
const { GraphQLError }         = require('graphql');

const resolvers = require('./resolvers/resolvers');


const cabinetRoutes     = require('./routes/cabinets');
const comptableRoutes   = require('./routes/comptables');
const clientRoutes      = require('./routes/clients');
const assignationRoutes = require('./routes/assignations');


const invoicesRoutes    = require('./routes/invoices');


const analyticsRoutes   = require('./routes/analytics');

const PORT = process.env.PORT || 3000;

const GRPC_HTTP_MAP = {
    5:  404,
    6:  409,
    9:  400,
    13: 500,
    14: 503,
};

async function start() {
    const app = express();

    app.use(cors());
    app.use(bodyParser.json());

    app.use('/api/cabinets',     cabinetRoutes);
    app.use('/api/comptables',   comptableRoutes);
    app.use('/api/clients',      clientRoutes);
    app.use('/api/assignations', assignationRoutes);

    app.use('/api/invoices',     invoicesRoutes);

    app.use('/api/analytics',    analyticsRoutes);

    app.get('/', (req, res) => res.json({
        service: 'API Gateway',
        status:  'running',
        rest: {
            'MS1 — Identity': [
                'POST   /api/cabinets',
                'GET    /api/cabinets',
                'GET    /api/cabinets/:id',
                'POST   /api/comptables',
                'GET    /api/comptables',
                'GET    /api/comptables/:id',
                'GET    /api/comptables/specialite/:specialite',
                'POST   /api/clients',
                'GET    /api/clients',
                'GET    /api/clients/:id',
                'POST   /api/assignations',
                'GET    /api/assignations/client/:client_id',
            ],
            'MS2 — Documents': [
                'POST   /api/invoices',
                'GET    /api/invoices',
                'GET    /api/invoices/:id',
                'GET    /api/invoices/client/:client_id',
                'PUT    /api/invoices/:id',
                'PUT    /api/invoices/:id/sign',
                'DELETE /api/invoices/:id',
                'POST   /api/invoices/declarations',
                'GET    /api/invoices/declarations',
                'GET    /api/invoices/declarations/:id',
                'GET    /api/invoices/declarations/client/:client_id',
                'PUT    /api/invoices/declarations/:id',
                'PUT    /api/invoices/declarations/:id/validate',
                'DELETE /api/invoices/declarations/:id',
            ],
            'MS3 — Analytics': [
                'POST   /api/analytics/alertes',
                'GET    /api/analytics/alertes',
                'GET    /api/analytics/alertes/client/:client_id',
                'POST   /api/analytics/reports',
                'GET    /api/analytics/reports',
                'GET    /api/analytics/reports/:id',
                'GET    /api/analytics/reports/client/:client_id',
                'PUT    /api/analytics/reports/:id',
                'DELETE /api/analytics/reports/:id',
                'GET    /api/analytics/stats',
                'GET    /api/analytics/stats/:id',
                'GET    /api/analytics/stats/client/:client_id',
                'GET    /api/analytics/audit',
                'GET    /api/analytics/audit/client/:client_id',
                'GET    /api/analytics/audit/entity/:entity_type/:entity_id',
                'GET    /api/analytics/dashboard/:client_id',
            ],
        },
        graphql: 'POST /graphql  (Apollo Sandbox sur GET /graphql)',
    }));

    const typeDefs = fs.readFileSync(
        path.join(__dirname, 'schemas', 'schema.gql'), 'utf8'
    );
    const schema              = buildSchema(typeDefs);
    const schemaWithResolvers = addResolversToSchema({ schema, resolvers });

    const apollo = new ApolloServer({
        schema: schemaWithResolvers,
        formatError(formattedError, error) {
            const originalError = error?.originalError ?? error;
            const grpcCode = originalError?.code;
            if (grpcCode !== undefined) {
                const httpStatus = GRPC_HTTP_MAP[grpcCode] ?? 500;
                return new GraphQLError(originalError.message ?? formattedError.message, {
                    extensions: {
                        code:       grpcCodeLabel(grpcCode),
                        httpStatus,
                        grpcCode,
                    },
                });
            }
            return formattedError;
        },
    });
    await apollo.start();

    app.use('/graphql', expressMiddleware(apollo));

    // Start
    app.listen(PORT, () => {
        console.log(`[Gateway] REST    → http://localhost:${PORT}/api`);
        console.log(`[Gateway] GraphQL → http://localhost:${PORT}/graphql`);
    });
}

// Libellés gRPC pour le champ extensions.code
function grpcCodeLabel(code) {
    const labels = {
        0:  'OK',
        1:  'CANCELLED',
        2:  'UNKNOWN',
        3:  'INVALID_ARGUMENT',
        4:  'DEADLINE_EXCEEDED',
        5:  'NOT_FOUND',
        6:  'ALREADY_EXISTS',
        7:  'PERMISSION_DENIED',
        8:  'RESOURCE_EXHAUSTED',
        9:  'FAILED_PRECONDITION',
        10: 'ABORTED',
        12: 'UNIMPLEMENTED',
        13: 'INTERNAL',
        14: 'UNAVAILABLE',
        16: 'UNAUTHENTICATED',
    };
    return labels[code] ?? `GRPC_${code}`;
}

start();
