import { db } from "@/utils/db/dbConfig";
import { Users } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export class UserService {
  static async getByEmail(email: string) {
    try {
      const [user] = await db.select().from(Users).where(eq(Users.email, email)).execute();
      return user || null;
    } catch (error) {
      console.error("[UserService.getByEmail] Error:", error);
      return null;
    }
  }

  static async getById(id: number) {
    try {
      const [user] = await db.select().from(Users).where(eq(Users.id, id)).execute();
      return user || null;
    } catch (error) {
      console.error("[UserService.getById] Error:", error);
      return null;
    }
  }

  static async createWithPassword(email: string, name: string, password: string, role: "citizen" | "admin" | "worker" | "volunteer" = "citizen") {
    try {
      const existing = await this.getByEmail(email);
      if (existing) return { error: "EMAIL_EXISTS" as const };

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const [user] = await db.insert(Users).values({ email, name, passwordHash, role }).returning().execute();
      return { user };
    } catch (error) {
      console.error("[UserService.createWithPassword] Error:", error);
      return { error: "UNKNOWN" as const };
    }
  }

  static async getAllUsers() {
    try {
      return await db.select().from(Users).execute();
    } catch (error) {
      console.error("[UserService.getAllUsers] Error:", error);
      return [];
    }
  }
}
