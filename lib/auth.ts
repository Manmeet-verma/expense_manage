import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare, hash } from "bcryptjs"
import { prisma } from "./prisma"
import { Role } from "@/lib/types"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

if (!authSecret) {
  throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is required")
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing email or password")
          return null
        }

        const normalizedEmail = (credentials.email as string).trim().toLowerCase()

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        })

        if (!user) {
          console.log(`[AUTH] User not found: ${normalizedEmail}`)
          return null
        }

        if (!user.password) {
          console.log(`[AUTH] User has no password set: ${normalizedEmail}`)
          return null
        }

        try {
          const isPasswordValid = await compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            console.log(`[AUTH] Invalid password for: ${normalizedEmail}`)
            return null
          }
        } catch (error) {
          console.error(`[AUTH] Password comparison error: ${error}`)
          return null
        }

        console.log(`[AUTH] Login successful: ${normalizedEmail}`)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role as Role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
})

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}
