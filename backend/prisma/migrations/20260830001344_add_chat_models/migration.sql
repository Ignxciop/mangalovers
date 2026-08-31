-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "is_spoiler" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_reports" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolvedById" TEXT,
    "admin_note" TEXT,

    CONSTRAINT "chat_message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mutes" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "muted_until" TIMESTAMP(3),
    "reason" TEXT,
    "mutedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_mutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "chat_message_reports_messageId_idx" ON "chat_message_reports"("messageId");

-- CreateIndex
CREATE INDEX "chat_message_reports_reporterId_idx" ON "chat_message_reports"("reporterId");

-- CreateIndex
CREATE INDEX "chat_message_reports_status_idx" ON "chat_message_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chat_mutes_userId_key" ON "chat_mutes"("userId");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_mutedById_fkey" FOREIGN KEY ("mutedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
