-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_email_workspaceId_key" ON "WorkspaceInvite"("email", "workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: treat existing DONE items as completed when they were created
UPDATE "ActionItem" SET "completedAt" = "createdAt" WHERE "status" = 'DONE' AND "completedAt" IS NULL;

-- Audit log is append-only: block UPDATEs at the database level.
-- (Rows are only removed when their workspace is deleted.)
CREATE OR REPLACE FUNCTION audit_log_block_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog rows are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_block_update();
