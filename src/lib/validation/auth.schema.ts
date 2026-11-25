import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["citizen", "volunteer", "worker", "admin"]).optional(),
});

export const SignupSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["citizen", "admin", "worker", "volunteer"]).default("citizen"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
