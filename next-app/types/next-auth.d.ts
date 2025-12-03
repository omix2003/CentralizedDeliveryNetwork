import "next-auth"

type UserRole = 'AGENT' | 'PARTNER' | 'ADMIN';

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email: string
            name: string
            role: UserRole
            agentId?: string
            partnerId?: string
            image?: string | null
        }
        accessToken?: string
    }
    interface User {
        id: string
        email: string
        name: string
        role: UserRole
        agentId?: string
        partnerId?: string
        image?: string | null
    }
}
declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: UserRole
        agentId?: string
        partnerId?: string
        accessToken?: string
    }
}
