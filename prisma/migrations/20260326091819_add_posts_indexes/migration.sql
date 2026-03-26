-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_author_id_fkey";

-- CreateIndex
CREATE INDEX "post_tags_tag_id_idx" ON "post_tags"("tag_id");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "posts_status_published_at_idx" ON "posts"("status", "published_at");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
