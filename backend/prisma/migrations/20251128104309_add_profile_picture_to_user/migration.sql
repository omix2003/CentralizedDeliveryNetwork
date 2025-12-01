-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePicture" TEXT;

-- CreateIndex
CREATE INDEX "Agent_status_isApproved_isBlocked_idx" ON "Agent"("status", "isApproved", "isBlocked");

-- CreateIndex
CREATE INDEX "Agent_isApproved_createdAt_idx" ON "Agent"("isApproved", "createdAt");

-- CreateIndex
CREATE INDEX "AgentDocument_verified_idx" ON "AgentDocument"("verified");

-- CreateIndex
CREATE INDEX "AgentDocument_documentType_idx" ON "AgentDocument"("documentType");

-- CreateIndex
CREATE INDEX "AgentDocument_agentId_documentType_verified_idx" ON "AgentDocument"("agentId", "documentType", "verified");

-- CreateIndex
CREATE INDEX "Order_priority_idx" ON "Order"("priority");

-- CreateIndex
CREATE INDEX "Order_status_agentId_idx" ON "Order"("status", "agentId");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
