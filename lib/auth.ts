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
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
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
  },
})

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}
