-- CoSync — PostgreSQL Row Level Security (RLS) policies
-- Run this migration AFTER `prisma migrate deploy` on PostgreSQL.
-- These policies enforce tenant isolation at the database level as
-- defense-in-depth alongside the application-layer ORM scoping.

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiInsight" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_owner_access" ON "Document"
  FOR ALL
  USING ("ownerId" = current_setting('app.current_user_id', true));

CREATE POLICY "document_member_access" ON "Document"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."documentId" = "Document"."id"
        AND m."userId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "membership_visible_to_members" ON "Membership"
  FOR SELECT
  USING (
    "userId" = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM "Document" d
      WHERE d."id" = "Membership"."documentId"
        AND d."ownerId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "membership_owner_modify" ON "Membership"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Document" d
      WHERE d."id" = "Membership"."documentId"
        AND d."ownerId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "version_visible_to_members" ON "DocumentVersion"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Document" d
      WHERE d."id" = "DocumentVersion"."documentId"
        AND (d."ownerId" = current_setting('app.current_user_id', true)
             OR EXISTS (
               SELECT 1 FROM "Membership" m
               WHERE m."documentId" = d."id"
                 AND m."userId" = current_setting('app.current_user_id', true)
             ))
    )
  );

CREATE POLICY "version_create_by_editor" ON "DocumentVersion"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Document" d
      WHERE d."id" = "DocumentVersion"."documentId"
        AND (d."ownerId" = current_setting('app.current_user_id', true)
             OR EXISTS (
               SELECT 1 FROM "Membership" m
               WHERE m."documentId" = d."id"
                 AND m."userId" = current_setting('app.current_user_id', true)
                 AND m."role" IN ('OWNER', 'EDITOR')
             ))
    )
  );

CREATE POLICY "ai_visible_to_members" ON "AiInsight"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Document" d
      WHERE d."id" = "AiInsight"."documentId"
        AND (d."ownerId" = current_setting('app.current_user_id', true)
             OR EXISTS (
               SELECT 1 FROM "Membership" m
               WHERE m."documentId" = d."id"
                 AND m."userId" = current_setting('app.current_user_id', true)
             ))
    )
  );
