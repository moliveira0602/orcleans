"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error('[Error]', err);
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({ error: 'Erro na base de dados' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
}
//# sourceMappingURL=error.js.map