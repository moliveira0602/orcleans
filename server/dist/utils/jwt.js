"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../config/jwt");
function generateAccessToken(payload) {
    const options = {
        expiresIn: '15m',
    };
    return jsonwebtoken_1.default.sign(payload, jwt_1.jwtConfig.accessSecret, options);
}
function generateRefreshToken(userId) {
    const options = {
        expiresIn: '7d',
    };
    return jsonwebtoken_1.default.sign({ sub: userId }, jwt_1.jwtConfig.refreshSecret, options);
}
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.refreshSecret);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map