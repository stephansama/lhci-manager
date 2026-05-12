import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [admin()],
    socialProviders: {
        ...(process.env.GITHUB_CLIENT_ID ? {
            github: {
                clientId: process.env.GITHUB_CLIENT_ID!,
                clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            },
        } : {}),
        ...(process.env.GOOGLE_CLIENT_ID ? {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            },
        } : {}),
        ...(process.env.APPLE_CLIENT_ID ? {
            apple: {
                clientId: process.env.APPLE_CLIENT_ID!,
                clientSecret: process.env.APPLE_CLIENT_SECRET!,
            },
        } : {}),
    },
});
