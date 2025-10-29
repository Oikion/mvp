import { prismadb } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { newUserNotify } from "./new-user-notify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

function getGoogleCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_SECRET;
  if (!clientId || clientId.length === 0) {
    throw new Error("Missing GOOGLE_ID");
  }

  if (!clientSecret || clientSecret.length === 0) {
    throw new Error("Missing GOOGLE_SECRET");
  }

  return { clientId, clientSecret };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.JWT_SECRET,
  //adapter: PrismaAdapter(prismadb),
  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: getGoogleCredentials().clientId,
      clientSecret: getGoogleCredentials().clientSecret,
    }),

    GitHubProvider({
      name: "github",
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },

      async authorize(credentials) {
        // console.log(credentials, "credentials");
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email or password is missing");
        }

        const user = await prismadb.users.findFirst({
          where: {
            email: credentials.email,
          },
        });

        //clear white space from password
        const trimmedPassword = credentials.password.trim();

        if (!user || !user?.password) {
          throw new Error("User not found, please register first");
        }

        const isCorrectPassword = await compare(
          trimmedPassword,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Password is incorrect");
        }

        //console.log(user, "user");
        return user;
      },
    }),
  ],
  callbacks: {
    //TODO: fix this any
    async session({ token, session }: any) {
      const user = await prismadb.users.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!user) {
        try {
          // Check if this is the first user in the system
          const userCount = await prismadb.users.count();
          const isFirstUser = userCount === 0;
          
          const newUser = await prismadb.users.create({
            data: {
              email: token.email,
              name: token.name,
              avatar: token.picture,
              is_admin: isFirstUser, // First user becomes admin
              is_account_admin: false,
              lastLoginAt: new Date(),
              userStatus: isFirstUser 
                ? "ACTIVE" // First user is automatically active
                : process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io"
                  ? "ACTIVE"
                  : "PENDING",
            },
          });

          // Only notify admins if this is NOT the first user
          if (!isFirstUser) {
            await newUserNotify(newUser);
          }

          //Put new created user data in session
          session.user.id = newUser.id;
          session.user.name = newUser.name;
          session.user.email = newUser.email;
          session.user.avatar = newUser.avatar;
          session.user.image = newUser.avatar;
          session.user.isAdmin = newUser.is_admin; // Use the actual admin status
          session.user.userLanguage = newUser.userLanguage;
          session.user.userStatus = newUser.userStatus;
          session.user.lastLoginAt = newUser.lastLoginAt;
          return session;
        } catch (error) {
          return console.log(error);
        }
      } else {
        await prismadb.users.update({
          where: {
            id: user.id,
          },
          data: {
            lastLoginAt: new Date(),
          },
        });
        //User allready exist in localDB, put user data in session
        session.user.id = user.id;
        session.user.name = user.name;
        session.user.email = user.email;
        session.user.avatar = user.avatar;
        session.user.image = user.avatar;
        session.user.isAdmin = user.is_admin;
        session.user.userLanguage = user.userLanguage;
        session.user.userStatus = user.userStatus;
        session.user.lastLoginAt = user.lastLoginAt;
      }

      //console.log(session, "session");
      return session;
    },
  },
};
