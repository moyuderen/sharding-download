"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const sleep = (time = 1000) => new Promise((resolve) => setTimeout(resolve, time));
exports.sleep = sleep;
//# sourceMappingURL=utils.js.map