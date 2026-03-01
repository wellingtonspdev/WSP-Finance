const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
    info: {
        title: 'API WSP Finance',
        version: '1.0.0',
        description: 'API para gestão financeira híbrida (Pessoal e Empresarial). Documentação gerada automaticamente via swagger-autogen.',
    },
    servers: [
        {
            url: 'http://localhost:3333',
            description: 'Servidor de Desenvolvimento',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            WorkspaceHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'x-workspace-id',
                description: 'ID do Workspace Ativo',
            }
        },
        schemas: {
            ErrorResponse: {
                status: 'error',
                message: 'Internal server error'
            },
            ValidationError: {
                status: 'validation_error',
                message: 'Erro de validação nos dados enviados.',
                issues: [
                    {
                        message: "error string",
                        path: ["field_name"]
                    }
                ]
            }
        }
    },
    security: [{ bearerAuth: [] }]
};

const outputFile = './src/swagger-output.json';
const routes = ['./src/routes.ts'];

/* NOTE: If you are using the express Router, you must pass in the 'routes.ts'
   only the index, usually containing the app.use(), then the autogen will automatically grab
   the imported controllers */
swaggerAutogen(outputFile, routes, doc).then(() => {
    console.log("📄 Documentação Swagger gerada com sucesso!");
});
