import { getServerSession, type NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare, hash } from "bcryptjs"
import { prisma } from "./prisma"
import { Role } from "@/lib/types"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
const isProduction = process.env.NODE_ENV === "production"

if (!authSecret) {
  throw new Error(
    "Missing auth secret: set AUTH_SECRET or NEXTAUTH_SECRET in the deployment environment"
  )
}

if (isProduction) {
  console.info("[AUTH] Environment check", {
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
  })
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  jwt: {
    maxAge: 5 * 365 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const normalizedEmail = (credentials.email as string).trim().toLowerCase()

        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: "insensitive",
            },
          },
        })

        if (!user) {
          return null
        }

        if (!user.password) {
          return null
        }

        const inputPassword = credentials.password as string
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(user.password)

        const isPasswordValid = isBcryptHash
          ? await compare(inputPassword, user.password)
          : inputPassword === user.password

        if (!isPasswordValid) {
          return null
        }

        // Best-effort auto-migration for legacy plaintext passwords.
        // Do not block login if migration fails.
        if (!isBcryptHash) {
          try {
            const upgradedHash = await hashPassword(inputPassword)
            await prisma.user.update({
              where: { id: user.id },
              data: { password: upgradedHash },
            })
          } catch (error) {
            console.error("[AUTH] Password hash upgrade failed:", error)
          }
        }

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
      console.log("[JWT] jwt callback", { user, token: { ...token, picture: undefined } })
      if (user) {
        token.id = user.id as string
        token.role = user.role as Role
      }
      return token
    },
    async session({ session, token }) {
      console.log("[SESSION] session callback", { token: { ...token, picture: undefined } })
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
    maxAge: 5 * 365 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
}

export function auth() {
  return getServerSession(authOptions)
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}
