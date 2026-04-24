"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
const env_1 = require("./env");
exports.jwtConfig = {
    accessSecret: env_1.env.JWT_SECRET,
    accessExpiresIn: env_1.env.JWT_EXPIRES_IN,
    refreshSecret: env_1.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
};
//# sourceMappingURL=jwt.js.map