/*
  Warnings:

  - Added the required column `workspaceId` to the `ActionItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ActionItem" DROP CONSTRAINT "ActionItem_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "ActionItem" DROP CONSTRAINT "ActionItem_goalId_fkey";

-- Add workspaceId column as nullable first
ALTER TABLE "ActionItem" ADD COLUMN "workspaceId" INTEGER;

-- Populate workspaceId from the linked goal
UPDATE "ActionItem" SET "workspaceId" = (SELECT "workspaceId" FROM "Goal" WHERE "Goal"."id" = "ActionItem"."goalId");

-- Now make it NOT NULL
ALTER TABLE "ActionItem" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Make goalId and assigneeId optional
ALTER TABLE "ActionItem" ALTER COLUMN "goalId" DROP NOT NULL;
ALTER TABLE "ActionItem" ALTER COLUMN "assigneeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
