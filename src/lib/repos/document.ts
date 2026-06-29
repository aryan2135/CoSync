import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export async function listDocumentsForUser(userId: string) {
  return db.document.findMany({
    where: {
      isArchived: false,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true, title: true, preview: true, wordCount: true,
      updatedAt: true, createdAt: true,
      owner: { select: { id: true, name: true, email: true } },
      members: {
        select: {
          userId: true, role: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDocumentForUser(userId: string, documentId: string) {
  const doc = await db.document.findUnique({
    where: { id: documentId, isArchived: false },
    select: {
      id: true, title: true, preview: true, wordCount: true,
      state: true, stateVector: true, createdAt: true, updatedAt: true,
      ownerId: true,
      owner: { select: { id: true, name: true, email: true } },
      members: {
        select: {
          userId: true, role: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });
  if (!doc) return null;
  if (doc.ownerId !== userId && !doc.members.some((m) => m.userId === userId)) return null;
  return doc;
}

export async function createDocument(userId: string, title = "Untitled document") {
  return db.document.create({
    data: { title, ownerId: userId },
    select: { id: true, title: true, createdAt: true },
  });
}

export async function updateDocumentMeta(documentId: string, title: string) {
  return db.document.update({
    where: { id: documentId }, data: { title },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function persistDocumentState(
  documentId: string,
  data: { state: Buffer; stateVector: Buffer; preview: string; wordCount: number },
) {
  return db.document.update({
    where: { id: documentId },
    data: {
      state: new Uint8Array(data.state),
      stateVector: new Uint8Array(data.stateVector),
      preview: data.preview.slice(0, 500),
      wordCount: data.wordCount,
      updatedAt: new Date(),
    },
    select: { id: true, updatedAt: true },
  });
}

export async function archiveDocument(documentId: string) {
  return db.document.update({ where: { id: documentId }, data: { isArchived: true } });
}

export async function addMember(documentId: string, userId: string, role: Role) {
  return db.membership.upsert({
    where: { userId_documentId: { userId, documentId } },
    update: { role }, create: { userId, documentId, role },
  });
}

export async function removeMember(documentId: string, userId: string) {
  return db.membership.delete({ where: { userId_documentId: { userId, documentId } } });
}

export async function listMembers(documentId: string) {
  const [members, doc] = await Promise.all([
    db.membership.findMany({
      where: { documentId },
      select: { userId: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    db.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true, owner: { select: { id: true, name: true, email: true, image: true } } },
    }),
  ]);
  const ownerEntry = doc ? { userId: doc.owner.id, role: "OWNER" as const, createdAt: new Date(0), user: doc.owner } : null;
  return ownerEntry ? [ownerEntry, ...members] : members;
}
