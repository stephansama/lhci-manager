import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { passkeyClient } from "@better-auth/passkey/client"

export const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL,
    plugins: [adminClient(), passkeyClient()],
})
