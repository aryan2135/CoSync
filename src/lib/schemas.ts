import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional().default("Untitled document"),
});

export const updateDocumentMetaSchema = z.object({
  title: z.string().min(1).max(200),
});

export const createVersionSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  state: z.string(),
  stateVector: z.string(),
  contentText: z.string(),
  contentHtml: z.string(),
  wordCount: z.number().int().min(0),
  charCount: z.number().int().min(0),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
});
