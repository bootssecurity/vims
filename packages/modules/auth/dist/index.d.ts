import jwt from "jsonwebtoken";
export declare const authStrategies: string[];
export declare const authModule: import("@vims/framework").VimsModuleDefinition<{
    strategies: string[];
    issueSessionToken(userId: string): string;
    verifySessionToken(token: string): ({
        userId: string;
    } & jwt.JwtPayload) | null;
}>;
