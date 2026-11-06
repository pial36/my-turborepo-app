-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "createdById" INTEGER;

-- Update existing records to point to the first user (or admin)
UPDATE "ActionItem" SET "createdById" = (SELECT id FROM "User" ORDER BY id LIMIT 1) WHERE "createdById" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "ActionItem" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
