"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const redis_1 = require("./lib/redis");
const error_middleware_1 = require("./middleware/error.middleware");
const websocket_1 = require("./lib/websocket");
const prisma_1 = require("./lib/prisma");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
const partner_routes_1 = __importDefault(require("./routes/partner.routes"));
const partner_api_routes_1 = __importDefault(require("./routes/partner-api.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// NOTIFICATIONS DISABLED
// import notificationRoutes from './routes/notification.routes';
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const rating_routes_1 = __importDefault(require("./routes/rating.routes"));
// Load environment variables
dotenv_1.default.config();
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Log the error but don't crash the server
    if (reason instanceof Error) {
        console.error('Error details:', {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
        });
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
    });
    // In production, you might want to gracefully shutdown
    // For now, we'll just log it
});
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
// Initialize Redis connection (optional - app will work without it)
if (process.env.REDIS_ENABLED === 'false') {
    console.log('ℹ️  Redis is disabled (REDIS_ENABLED=false). Running without Redis.');
}
else {
    try {
        (0, redis_1.getRedisClient)();
    }
    catch (error) {
        // Redis initialization failed, but we'll continue without it
    }
}
// CORS configuration - support multiple origins
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : ['http://localhost:3000'];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
// JSON parser with error handling
app.use(express_1.default.json({
    strict: true
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
    // Get the origin from the request
    const requestOrigin = req.headers.origin;
    const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : ['http://localhost:3000'];
    // Set CORS headers for static files
    if (requestOrigin && (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*'))) {
        res.header('Access-Control-Allow-Origin', requestOrigin);
    }
    else if (allowedOrigins.length > 0) {
        res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
}, express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Custom JSON error handler
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON. Please ensure you use double quotes for property names and values, and check for trailing commas.',
            details: err.message
        });
    }
    next(err);
});
// Request logging middleware (for debugging)
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.originalUrl}`);
    // Log if it's an agent route
    if (req.originalUrl.startsWith('/api/agent')) {
        console.log(`[DEBUG] Agent route request: ${req.method} ${req.originalUrl}`);
        console.log(`[DEBUG] Has auth header: ${!!req.headers.authorization}`);
        console.log(`[DEBUG] Auth header value: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'none'}`);
    }
    next();
});
// Health check route
app.get('/health', async (req, res) => {
    let redisStatus = 'disconnected';
    let redisDetails = null;
    try {
        const isConnected = await (0, redis_1.testRedisConnection)();
        redisStatus = isConnected ? 'connected' : 'disconnected';
        redisDetails = (0, redis_1.getRedisStatus)();
    }
    catch (error) {
        redisStatus = 'error';
        redisDetails = { error: 'Failed to check Redis status' };
    }
    res.json({
        status: 'ok',
        message: 'Backend server is running',
        redis: redisStatus,
        redisDetails,
    });
});
// API routes
console.log('📦 Registering API routes...');
try {
    console.log('[DEBUG] Imported agentRoutes type:', typeof agent_routes_1.default);
    console.log('[DEBUG] agentRoutes constructor:', agent_routes_1.default?.constructor?.name);
    // Public routes (no authentication)
    app.use('/api/public', public_routes_1.default);
    app.use('/api/auth', auth_routes_1.default);
    console.log('✅ Auth routes registered at /api/auth');
    // Verify agentRoutes is actually a router
    const agentRoutesAny = agent_routes_1.default;
    if (!agent_routes_1.default || typeof agent_routes_1.default !== 'function') {
        console.error('❌ agentRoutes is not a valid router!', {
            type: typeof agent_routes_1.default,
            value: agent_routes_1.default,
            constructor: agentRoutesAny?.constructor?.name
        });
        throw new Error('agentRoutes is not a valid Express router');
    }
    app.use('/api/agent', agent_routes_1.default);
    console.log('✅ Agent routes registered at /api/agent');
    console.log('[DEBUG] Agent routes stack:', agentRoutesAny?.stack?.length || 0, 'routes');
    // Log the actual routes in the stack
    if (agentRoutesAny?.stack) {
        console.log('[DEBUG] Agent routes in stack:');
        agentRoutesAny.stack.forEach((layer, index) => {
            if (layer.route) {
                console.log(`  [${index}] ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
            }
            else if (layer.name === 'router' || layer.regexp) {
                console.log(`  [${index}] Middleware: ${layer.name || 'unnamed'}`);
            }
            else {
                console.log(`  [${index}] ${layer.name || 'unknown'}`);
            }
        });
    }
    app.use('/api/partner', partner_routes_1.default);
    console.log('✅ Partner routes registered at /api/partner');
    app.use('/api/partner-api', partner_api_routes_1.default);
    console.log('✅ Partner API routes registered at /api/partner-api (API key auth)');
    app.use('/api/admin', admin_routes_1.default);
    console.log('✅ Admin routes registered at /api/admin');
    app.use('/api/ratings', rating_routes_1.default);
    console.log('✅ Rating routes registered at /api/ratings');
    // NOTIFICATIONS DISABLED
    // app.use('/api/notifications', notificationRoutes);
    // console.log('✅ Notification routes registered at /api/notifications');
}
catch (error) {
    console.error('❌ Error registering routes:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
}
// Debug route to test routing
app.get('/api/test', (req, res) => {
    res.json({ message: 'API routing is working', path: req.path });
});
// Debug route to list all registered routes
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    const agentRoutes = [];
    // Get all registered routes from Express
    app._router?.stack?.forEach((middleware) => {
        if (middleware.route) {
            // Direct route
            const routeInfo = {
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods),
                type: 'direct'
            };
            routes.push(routeInfo);
            if (routeInfo.path.includes('/agent')) {
                agentRoutes.push(routeInfo);
            }
        }
        else if (middleware.name === 'router') {
            // Router middleware
            const basePath = middleware.regexp.source
                .replace('\\/?', '')
                .replace('(?=\\/|$)', '')
                .replace(/\\\//g, '/')
                .replace(/\^/g, '')
                .replace(/\$/g, '');
            middleware.handle?.stack?.forEach((handler) => {
                if (handler.route) {
                    const fullPath = basePath + handler.route.path;
                    const routeInfo = {
                        path: fullPath,
                        methods: Object.keys(handler.route.methods),
                        basePath: basePath,
                        routePath: handler.route.path,
                        type: 'router'
                    };
                    routes.push(routeInfo);
                    if (fullPath.includes('/agent')) {
                        agentRoutes.push(routeInfo);
                    }
                }
                else if (handler.name === 'router') {
                    // Nested router
                    const nestedBasePath = handler.regexp.source
                        .replace('\\/?', '')
                        .replace('(?=\\/|$)', '')
                        .replace(/\\\//g, '/')
                        .replace(/\^/g, '')
                        .replace(/\$/g, '');
                    handler.handle?.stack?.forEach((nestedHandler) => {
                        if (nestedHandler.route) {
                            const fullPath = basePath + nestedBasePath + nestedHandler.route.path;
                            const routeInfo = {
                                path: fullPath,
                                methods: Object.keys(nestedHandler.route.methods),
                                basePath: basePath,
                                nestedBasePath: nestedBasePath,
                                routePath: nestedHandler.route.path,
                                type: 'nested-router'
                            };
                            routes.push(routeInfo);
                            if (fullPath.includes('/agent')) {
                                agentRoutes.push(routeInfo);
                            }
                        }
                    });
                }
            });
        }
    });
    res.json({
        message: 'Registered routes',
        totalRoutes: routes.length,
        agentRoutesCount: agentRoutes.length,
        agentRoutes: agentRoutes,
        allRoutes: routes.slice(0, 50), // Limit to first 50 for readability
    });
});
// Error handler - must come before 404 handler
app.use(error_middleware_1.errorHandler);
// Method not allowed handler - check if route exists with different method
app.use((req, res, next) => {
    // Check if this is a known route path but wrong method
    const knownRoutes = [
        { path: '/api/auth/login', methods: ['POST'] },
        { path: '/api/auth/register', methods: ['POST'] },
        { path: '/api/auth/me', methods: ['GET'] },
        { path: '/api/auth/profile-picture', methods: ['POST'] },
        { path: '/api/auth/change-password', methods: ['PUT'] },
    ];
    const route = knownRoutes.find(r => r.path === req.path);
    if (route && !route.methods.includes(req.method)) {
        return res.status(405).json({
            error: 'Method Not Allowed',
            message: `${req.method} method is not allowed for this route`,
            allowedMethods: route.methods,
            path: req.path,
        });
    }
    next();
});
// 404 handler - must be last (after error handler and method check)
app.use((req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        message: 'The requested route does not exist',
        availableRoutes: [
            'GET /health',
            'GET /api/test',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/auth/me',
            'GET /api/agent/profile',
            'GET /api/agent/metrics',
            'POST /api/agent/status'
        ]
    });
});
// Check database connection (non-blocking - server will start even if check fails)
(async () => {
    try {
        // Test database connection
        await prisma_1.prisma.$connect();
        console.log('✅ Database connection established');
        // Optional check to verify AgentRating table exists (non-blocking)
        try {
            await prisma_1.prisma.$queryRaw `SELECT 1 FROM "AgentRating" LIMIT 1`;
            console.log('✅ AgentRating table exists');
        }
        catch (tableError) {
            // Table doesn't exist - this is OK, migrations will create it
            if (tableError?.code === 'P2021' || tableError?.code === '42P01' || tableError?.message?.includes('does not exist')) {
                console.warn('⚠️  AgentRating table does not exist yet - migrations may need to run');
                console.warn('⚠️  This is normal on first deployment. Migrations should run via prestart script.');
            }
            else {
                console.warn('⚠️  Could not verify AgentRating table:', tableError?.message);
            }
        }
    }
    catch (error) {
        console.error('❌ Database connection failed:', {
            code: error?.code,
            message: error?.message,
            name: error?.name,
        });
        if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database server')) {
            console.error('❌ Cannot connect to database server!');
            console.error('⚠️  Please check DATABASE_URL environment variable');
            console.error('⚠️  Server will continue to start but database operations will fail');
        }
        else {
            console.error('⚠️  Database connection issue:', error?.message);
            console.error('⚠️  Server will continue to start but database operations may fail');
        }
    }
})();
// Initialize periodic delay checker (runs every minute)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DELAY_CHECKER === 'true') {
    setInterval(() => {
        (async () => {
            try {
                const { delayCheckerService } = await Promise.resolve().then(() => __importStar(require('./services/delay-checker.service')));
                await delayCheckerService.checkDelayedOrders();
            }
            catch (error) {
                console.error('[Server] Error in periodic delay check:', error);
            }
        })();
    }, 60000); // Check every minute
    console.log('✅ Periodic delay checker initialized (runs every 60 seconds)');
}
// Initialize WebSocket server
(0, websocket_1.initializeWebSocket)(httpServer);
// Start HTTP server
httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📡 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/test`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
    console.log(`   WebSocket: ws://localhost:${PORT}/socket.io`);
});
//# sourceMappingURL=server.js.map