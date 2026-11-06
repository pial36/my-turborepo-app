const swaggerJsdoc = require('swagger-jsdoc')
const extraPaths = require('./openapiPaths')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Hub API',
      version: '1.0.0',
      description: 'Collaborative Team Hub REST API'
    },
    // relative, so 'Try it out' calls whichever host is serving the docs
    servers: [{ url: '/' }],
    // every route except register/login uses the httpOnly accessToken cookie
    security: [{ cookieAuth: [] }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:        { type: 'integer' },
            name:      { type: 'string' },
            email:     { type: 'string' },
            avatar:    { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Workspace: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            name:        { type: 'string' },
            description: { type: 'string', nullable: true },
            accentColor: { type: 'string', nullable: true },
            createdAt:   { type: 'string', format: 'date-time' }
          }
        },
        Goal: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            title:       { type: 'string' },
            dueDate:     { type: 'string', format: 'date-time', nullable: true },
            status:      { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] },
            ownerId:     { type: 'integer' },
            workspaceId: { type: 'integer' }
          }
        },
        ActionItem: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            title:      { type: 'string' },
            priority:   { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            status:     { type: 'string', enum: ['TODO', 'DOING', 'DONE'] },
            dueDate:    { type: 'string', format: 'date-time', nullable: true },
            goalId:     { type: 'integer' },
            assigneeId: { type: 'integer' }
          }
        },
        Announcement: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            content:     { type: 'string' },
            pinned:      { type: 'boolean' },
            workspaceId: { type: 'integer' },
            authorId:    { type: 'integer' },
            createdAt:   { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        }
      },
      responses: {
        Error: {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        }
      }
    }
  },
  // scan all route files for JSDoc comments
  // absolute so docs work no matter which directory the process starts in
  apis: [require('path').join(__dirname, '../routes/*.js')]
}

const spec = swaggerJsdoc(options)

// JSDoc-documented routes win over the central definitions
spec.paths = { ...extraPaths, ...spec.paths }

module.exports = spec