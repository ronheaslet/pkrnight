-- CreateEnum
CREATE TYPE "ClubType" AS ENUM ('HOME_GAME', 'PUB_POKER', 'CIRCUIT');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'INVITED', 'PENDING');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('PAID', 'GUEST');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'NOT_GOING', 'MAYBE', 'PENDING');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'BREAK', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('ACTIVE', 'ELIMINATED', 'WINNER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY_IN', 'REBUY', 'ADD_ON', 'PAYOUT', 'BOUNTY_COLLECTED', 'BOUNTY_PAID_OUT', 'EXPENSE', 'DUES_PAYMENT', 'TREASURY_ADJUSTMENT', 'PLAYER_BALANCE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('GAME', 'DUES', 'EXPENSE_FOOD', 'EXPENSE_DRINKS', 'EXPENSE_VENUE', 'EXPENSE_DEALER_TIP', 'EXPENSE_OTHER', 'TREASURY', 'PLAYER_BALANCE');

-- CreateEnum
CREATE TYPE "ChipMode" AS ENUM ('CASH', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "BonusChipMode" AS ENUM ('TRACKED', 'SELF_REPORT', 'OFF');

-- CreateEnum
CREATE TYPE "FeatureState" AS ENUM ('GLOBALLY_ON', 'CLUB_CONFIGURABLE', 'GLOBALLY_OFF');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVITE', 'REMINDER', 'RESULTS', 'TROPHY', 'ANNOUNCEMENT', 'CHIP_VALUE_CHANGE', 'RSVP_CONFIRMATION', 'DUES_REMINDER', 'TABLE_MOVE', 'GAME_START', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'SMS', 'BOTH');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('LINK', 'QR_SCAN', 'EVENT_INVITE', 'ORGANIC');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('SIT_OUT', 'CHIP_PENALTY', 'WARNING', 'DISQUALIFICATION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'TRANSFER', 'APPROVE', 'REJECT', 'VOID');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "appleId" TEXT,
    "googleId" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clubType" "ClubType" NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "brandingKey" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "tagline" TEXT,
    "customDomain" TEXT,
    "publicBio" TEXT,
    "venueAddress" TEXT,
    "venueCity" TEXT,
    "socialLink" TEXT,
    "qrCodeUrl" TEXT,
    "referralCode" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "planExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'MEMBER',
    "memberType" "MemberType" NOT NULL DEFAULT 'PAID',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "pauseTimer" BOOLEAN NOT NULL DEFAULT false,
    "startGame" BOOLEAN NOT NULL DEFAULT false,
    "manageRebuys" BOOLEAN NOT NULL DEFAULT false,
    "eliminatePlayers" BOOLEAN NOT NULL DEFAULT false,
    "manageMoney" BOOLEAN NOT NULL DEFAULT false,
    "postTransactions" BOOLEAN NOT NULL DEFAULT false,
    "viewFinancials" BOOLEAN NOT NULL DEFAULT false,
    "exportReports" BOOLEAN NOT NULL DEFAULT false,
    "viewAuditLog" BOOLEAN NOT NULL DEFAULT false,
    "issuePenalties" BOOLEAN NOT NULL DEFAULT false,
    "makeAnnouncements" BOOLEAN NOT NULL DEFAULT false,
    "awardTrophies" BOOLEAN NOT NULL DEFAULT false,
    "postToFeed" BOOLEAN NOT NULL DEFAULT false,
    "postExpenseOnly" BOOLEAN NOT NULL DEFAULT false,
    "pauseAllTables" BOOLEAN NOT NULL DEFAULT false,
    "clubWideAnnounce" BOOLEAN NOT NULL DEFAULT false,
    "levelOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSpecialRole" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "customRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "MemberSpecialRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedLocation" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "seasonId" TEXT,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "savedLocationId" TEXT,
    "locationName" TEXT,
    "locationAddress" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "buyInAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebuyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addOnAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebuyLimit" INTEGER,
    "addOnAllowed" BOOLEAN NOT NULL DEFAULT false,
    "addOnCutoffLevel" INTEGER,
    "bountyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bountyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "guestEligible" BOOLEAN NOT NULL DEFAULT false,
    "maxPlayers" INTEGER,
    "blindStructureId" TEXT,
    "chipSetId" TEXT,
    "reminder48h" BOOLEAN NOT NULL DEFAULT true,
    "reminder24h" BOOLEAN NOT NULL DEFAULT true,
    "reminder2h" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "membershipId" TEXT,
    "guestToken" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "status" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindStructure" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlindStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindLevel" (
    "id" TEXT NOT NULL,
    "blindStructureId" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "smallBlind" INTEGER NOT NULL,
    "bigBlind" INTEGER NOT NULL,
    "ante" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 20,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "breakLabel" TEXT,

    CONSTRAINT "BlindLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "blindStructureId" TEXT,
    "chipSetId" TEXT,
    "status" "GameStatus" NOT NULL DEFAULT 'PENDING',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "levelStartedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "totalPausedMs" INTEGER NOT NULL DEFAULT 0,
    "playersRegistered" INTEGER NOT NULL DEFAULT 0,
    "playersRemaining" INTEGER NOT NULL DEFAULT 0,
    "buyInAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebuyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addOnAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebuyLimit" INTEGER,
    "bountyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bountyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRebuys" INTEGER NOT NULL DEFAULT 0,
    "totalAddOns" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "financialLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "tableNumber" INTEGER,
    "seatNumber" INTEGER,
    "currentStack" INTEGER,
    "startingStack" INTEGER,
    "finishPosition" INTEGER,
    "rebuys" INTEGER NOT NULL DEFAULT 0,
    "addOns" INTEGER NOT NULL DEFAULT 0,
    "bountiesWon" INTEGER NOT NULL DEFAULT 0,
    "bountiesLost" INTEGER NOT NULL DEFAULT 0,
    "payout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "buyInPaid" BOOLEAN NOT NULL DEFAULT false,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "walkInId" TEXT,
    "eliminatedAt" TIMESTAMP(3),
    "eliminatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTable" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "maxSeats" INTEGER NOT NULL DEFAULT 9,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penalty" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "penaltyType" "PenaltyType" NOT NULL,
    "durationMinutes" INTEGER,
    "chipAmount" INTEGER,
    "reason" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipSet" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "ChipMode" NOT NULL DEFAULT 'TOURNAMENT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChipSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipDenomination" (
    "id" TEXT NOT NULL,
    "chipSetId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChipDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipDenominationChange" (
    "id" TEXT NOT NULL,
    "chipDenominationId" TEXT NOT NULL,
    "gameId" TEXT,
    "clubId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "applyRetroactive" BOOLEAN NOT NULL DEFAULT true,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChipDenominationChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipScan" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "gameId" TEXT,
    "gameSessionId" TEXT,
    "chipSetId" TEXT NOT NULL,
    "chipCounts" JSONB NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" TEXT NOT NULL,
    "confidenceNote" TEXT,
    "claudeTokensIn" INTEGER NOT NULL,
    "claudeTokensOut" INTEGER NOT NULL,
    "claudeModel" TEXT NOT NULL,
    "claudeLatencyMs" INTEGER NOT NULL,
    "savedToSession" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChipScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "gameId" TEXT,
    "seasonId" TEXT,
    "personId" TEXT,
    "actorId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "method" TEXT,
    "bountyFromPersonId" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuesRecord" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" TEXT,
    "collectedBy" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryBalance" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumReserve" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerBalance" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSettledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "transactionId" TEXT,
    "ipAddress" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trophy" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "triggerCondition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trophy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrophyAward" (
    "id" TEXT NOT NULL,
    "trophyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "seasonId" TEXT,
    "gameId" TEXT,
    "awardedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrophyAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalFeatureFlag" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" "FeatureState" NOT NULL DEFAULT 'CLUB_CONFIGURABLE',
    "isContextLocked" BOOLEAN NOT NULL DEFAULT false,
    "contextNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "GlobalFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubFeatureFlag" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "personId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "smsSentAt" TIMESTAMP(3),
    "smsStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnnouncement" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT,
    "referredPersonId" TEXT,
    "clubId" TEXT,
    "source" "ReferralSource" NOT NULL,
    "deviceType" TEXT,
    "locationCity" TEXT,
    "locationState" TEXT,
    "linkTappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rsvpAt" TIMESTAMP(3),
    "accountCreatedAt" TIMESTAMP(3),
    "firstGameAt" TIMESTAMP(3),
    "active30dAt" TIMESTAMP(3),

    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkEdge" (
    "id" TEXT NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "firstPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gamesShared" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NetworkEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueProfile" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "operatingNights" TEXT[],
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusChipTransaction" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mode" "BonusChipMode" NOT NULL,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusChipTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkInEntry" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "tempName" TEXT NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "claimToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalkInEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circuit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitVenue" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "venueLabel" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CircuitVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitSeason" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "pointsFormula" TEXT NOT NULL DEFAULT 'standard',

    CONSTRAINT "CircuitSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitMember" (
    "id" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "bestFinish" INTEGER,

    CONSTRAINT "CircuitMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitStanding" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircuitStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "personId" TEXT,
    "severity" "ErrorSeverity" NOT NULL,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "route" TEXT,
    "requestData" JSONB,
    "smsSentToAdmin" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "personId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL,
    "tokensOut" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageViewLog" (
    "id" TEXT NOT NULL,
    "clubSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageViewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_phone_key" ON "Person"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Person_appleId_key" ON "Person"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_googleId_key" ON "Person"("googleId");

-- CreateIndex
CREATE INDEX "Person_phone_idx" ON "Person"("phone");

-- CreateIndex
CREATE INDEX "Person_appleId_idx" ON "Person"("appleId");

-- CreateIndex
CREATE INDEX "Person_googleId_idx" ON "Person"("googleId");

-- CreateIndex
CREATE INDEX "Person_isSuperAdmin_idx" ON "Person"("isSuperAdmin");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Club_brandingKey_key" ON "Club"("brandingKey");

-- CreateIndex
CREATE UNIQUE INDEX "Club_customDomain_key" ON "Club"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Club_referralCode_key" ON "Club"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Club_stripeCustomerId_key" ON "Club"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_stripeSubId_key" ON "Club"("stripeSubId");

-- CreateIndex
CREATE INDEX "Club_slug_idx" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_clubType_idx" ON "Club"("clubType");

-- CreateIndex
CREATE INDEX "Club_planTier_idx" ON "Club"("planTier");

-- CreateIndex
CREATE INDEX "Club_isActive_idx" ON "Club"("isActive");

-- CreateIndex
CREATE INDEX "Membership_clubId_idx" ON "Membership"("clubId");

-- CreateIndex
CREATE INDEX "Membership_personId_idx" ON "Membership"("personId");

-- CreateIndex
CREATE INDEX "Membership_systemRole_idx" ON "Membership"("systemRole");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_clubId_personId_key" ON "Membership"("clubId", "personId");

-- CreateIndex
CREATE INDEX "CustomRole_clubId_idx" ON "CustomRole"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_clubId_name_key" ON "CustomRole"("clubId", "name");

-- CreateIndex
CREATE INDEX "MemberSpecialRole_membershipId_idx" ON "MemberSpecialRole"("membershipId");

-- CreateIndex
CREATE INDEX "MemberSpecialRole_customRoleId_idx" ON "MemberSpecialRole"("customRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSpecialRole_membershipId_customRoleId_key" ON "MemberSpecialRole"("membershipId", "customRoleId");

-- CreateIndex
CREATE INDEX "Season_clubId_idx" ON "Season"("clubId");

-- CreateIndex
CREATE INDEX "Season_isActive_idx" ON "Season"("isActive");

-- CreateIndex
CREATE INDEX "SavedLocation_clubId_idx" ON "SavedLocation"("clubId");

-- CreateIndex
CREATE INDEX "Event_clubId_idx" ON "Event"("clubId");

-- CreateIndex
CREATE INDEX "Event_seasonId_idx" ON "Event"("seasonId");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_guestToken_key" ON "Rsvp"("guestToken");

-- CreateIndex
CREATE INDEX "Rsvp_eventId_idx" ON "Rsvp"("eventId");

-- CreateIndex
CREATE INDEX "Rsvp_guestToken_idx" ON "Rsvp"("guestToken");

-- CreateIndex
CREATE INDEX "Rsvp_status_idx" ON "Rsvp"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_eventId_membershipId_key" ON "Rsvp"("eventId", "membershipId");

-- CreateIndex
CREATE INDEX "BlindStructure_clubId_idx" ON "BlindStructure"("clubId");

-- CreateIndex
CREATE INDEX "BlindLevel_blindStructureId_idx" ON "BlindLevel"("blindStructureId");

-- CreateIndex
CREATE UNIQUE INDEX "BlindLevel_blindStructureId_levelNumber_key" ON "BlindLevel"("blindStructureId", "levelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Game_eventId_key" ON "Game"("eventId");

-- CreateIndex
CREATE INDEX "Game_clubId_idx" ON "Game"("clubId");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_startedAt_idx" ON "Game"("startedAt");

-- CreateIndex
CREATE INDEX "Game_clubId_status_idx" ON "Game"("clubId", "status");

-- CreateIndex
CREATE INDEX "Game_clubId_completedAt_idx" ON "Game"("clubId", "completedAt");

-- CreateIndex
CREATE INDEX "GameSession_gameId_idx" ON "GameSession"("gameId");

-- CreateIndex
CREATE INDEX "GameSession_personId_idx" ON "GameSession"("personId");

-- CreateIndex
CREATE INDEX "GameSession_clubId_idx" ON "GameSession"("clubId");

-- CreateIndex
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_gameId_personId_key" ON "GameSession"("gameId", "personId");

-- CreateIndex
CREATE INDEX "GameTable_gameId_idx" ON "GameTable"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameTable_gameId_tableNumber_key" ON "GameTable"("gameId", "tableNumber");

-- CreateIndex
CREATE INDEX "Penalty_gameId_idx" ON "Penalty"("gameId");

-- CreateIndex
CREATE INDEX "Penalty_issuedTo_idx" ON "Penalty"("issuedTo");

-- CreateIndex
CREATE INDEX "ChipSet_clubId_idx" ON "ChipSet"("clubId");

-- CreateIndex
CREATE INDEX "ChipSet_isDefault_idx" ON "ChipSet"("isDefault");

-- CreateIndex
CREATE INDEX "ChipDenomination_chipSetId_idx" ON "ChipDenomination"("chipSetId");

-- CreateIndex
CREATE UNIQUE INDEX "ChipDenomination_chipSetId_colorName_key" ON "ChipDenomination"("chipSetId", "colorName");

-- CreateIndex
CREATE INDEX "ChipDenominationChange_chipDenominationId_idx" ON "ChipDenominationChange"("chipDenominationId");

-- CreateIndex
CREATE INDEX "ChipDenominationChange_gameId_idx" ON "ChipDenominationChange"("gameId");

-- CreateIndex
CREATE INDEX "ChipDenominationChange_createdAt_idx" ON "ChipDenominationChange"("createdAt");

-- CreateIndex
CREATE INDEX "ChipScan_clubId_idx" ON "ChipScan"("clubId");

-- CreateIndex
CREATE INDEX "ChipScan_personId_idx" ON "ChipScan"("personId");

-- CreateIndex
CREATE INDEX "ChipScan_gameId_idx" ON "ChipScan"("gameId");

-- CreateIndex
CREATE INDEX "ChipScan_gameSessionId_idx" ON "ChipScan"("gameSessionId");

-- CreateIndex
CREATE INDEX "ChipScan_createdAt_idx" ON "ChipScan"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_clubId_idx" ON "Transaction"("clubId");

-- CreateIndex
CREATE INDEX "Transaction_gameId_idx" ON "Transaction"("gameId");

-- CreateIndex
CREATE INDEX "Transaction_personId_idx" ON "Transaction"("personId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "DuesRecord_clubId_idx" ON "DuesRecord"("clubId");

-- CreateIndex
CREATE INDEX "DuesRecord_personId_idx" ON "DuesRecord"("personId");

-- CreateIndex
CREATE INDEX "DuesRecord_isPaid_idx" ON "DuesRecord"("isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "DuesRecord_clubId_personId_seasonId_key" ON "DuesRecord"("clubId", "personId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryBalance_clubId_key" ON "TreasuryBalance"("clubId");

-- CreateIndex
CREATE INDEX "PlayerBalance_clubId_idx" ON "PlayerBalance"("clubId");

-- CreateIndex
CREATE INDEX "PlayerBalance_personId_idx" ON "PlayerBalance"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBalance_clubId_personId_key" ON "PlayerBalance"("clubId", "personId");

-- CreateIndex
CREATE INDEX "AuditLog_clubId_idx" ON "AuditLog"("clubId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Trophy_clubId_idx" ON "Trophy"("clubId");

-- CreateIndex
CREATE INDEX "TrophyAward_trophyId_idx" ON "TrophyAward"("trophyId");

-- CreateIndex
CREATE INDEX "TrophyAward_personId_idx" ON "TrophyAward"("personId");

-- CreateIndex
CREATE INDEX "TrophyAward_clubId_idx" ON "TrophyAward"("clubId");

-- CreateIndex
CREATE INDEX "TrophyAward_seasonId_idx" ON "TrophyAward"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFeatureFlag_featureKey_key" ON "GlobalFeatureFlag"("featureKey");

-- CreateIndex
CREATE INDEX "ClubFeatureFlag_clubId_idx" ON "ClubFeatureFlag"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubFeatureFlag_clubId_featureKey_key" ON "ClubFeatureFlag"("clubId", "featureKey");

-- CreateIndex
CREATE INDEX "Notification_personId_idx" ON "Notification"("personId");

-- CreateIndex
CREATE INDEX "Notification_clubId_idx" ON "Notification"("clubId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_clubId_idx" ON "ChatMessage"("clubId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_personId_key" ON "ReferralCode"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEvent_referredPersonId_key" ON "ReferralEvent"("referredPersonId");

-- CreateIndex
CREATE INDEX "ReferralEvent_referralCodeId_idx" ON "ReferralEvent"("referralCodeId");

-- CreateIndex
CREATE INDEX "ReferralEvent_clubId_idx" ON "ReferralEvent"("clubId");

-- CreateIndex
CREATE INDEX "ReferralEvent_referredPersonId_idx" ON "ReferralEvent"("referredPersonId");

-- CreateIndex
CREATE INDEX "ReferralEvent_source_idx" ON "ReferralEvent"("source");

-- CreateIndex
CREATE INDEX "ReferralEvent_linkTappedAt_idx" ON "ReferralEvent"("linkTappedAt");

-- CreateIndex
CREATE INDEX "NetworkEdge_personAId_idx" ON "NetworkEdge"("personAId");

-- CreateIndex
CREATE INDEX "NetworkEdge_personBId_idx" ON "NetworkEdge"("personBId");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkEdge_personAId_personBId_key" ON "NetworkEdge"("personAId", "personBId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueProfile_clubId_key" ON "VenueProfile"("clubId");

-- CreateIndex
CREATE INDEX "BonusChipTransaction_clubId_idx" ON "BonusChipTransaction"("clubId");

-- CreateIndex
CREATE INDEX "BonusChipTransaction_gameId_idx" ON "BonusChipTransaction"("gameId");

-- CreateIndex
CREATE INDEX "BonusChipTransaction_personId_idx" ON "BonusChipTransaction"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "WalkInEntry_claimToken_key" ON "WalkInEntry"("claimToken");

-- CreateIndex
CREATE INDEX "WalkInEntry_clubId_idx" ON "WalkInEntry"("clubId");

-- CreateIndex
CREATE INDEX "WalkInEntry_gameId_idx" ON "WalkInEntry"("gameId");

-- CreateIndex
CREATE INDEX "WalkInEntry_claimToken_idx" ON "WalkInEntry"("claimToken");

-- CreateIndex
CREATE UNIQUE INDEX "Circuit_slug_key" ON "Circuit"("slug");

-- CreateIndex
CREATE INDEX "CircuitVenue_circuitId_idx" ON "CircuitVenue"("circuitId");

-- CreateIndex
CREATE INDEX "CircuitVenue_clubId_idx" ON "CircuitVenue"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CircuitVenue_circuitId_clubId_key" ON "CircuitVenue"("circuitId", "clubId");

-- CreateIndex
CREATE INDEX "CircuitSeason_circuitId_idx" ON "CircuitSeason"("circuitId");

-- CreateIndex
CREATE INDEX "CircuitMember_circuitId_idx" ON "CircuitMember"("circuitId");

-- CreateIndex
CREATE INDEX "CircuitMember_userId_idx" ON "CircuitMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircuitMember_circuitId_userId_key" ON "CircuitMember"("circuitId", "userId");

-- CreateIndex
CREATE INDEX "CircuitStanding_seasonId_idx" ON "CircuitStanding"("seasonId");

-- CreateIndex
CREATE INDEX "CircuitStanding_seasonId_rank_idx" ON "CircuitStanding"("seasonId", "rank");

-- CreateIndex
CREATE INDEX "CircuitStanding_seasonId_userId_idx" ON "CircuitStanding"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircuitStanding_seasonId_userId_key" ON "CircuitStanding"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "ErrorLog_clubId_idx" ON "ErrorLog"("clubId");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_smsSentToAdmin_idx" ON "ErrorLog"("smsSentToAdmin");

-- CreateIndex
CREATE INDEX "ErrorLog_resolvedAt_createdAt_idx" ON "ErrorLog"("resolvedAt", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_clubId_idx" ON "AIUsageLog"("clubId");

-- CreateIndex
CREATE INDEX "AIUsageLog_feature_idx" ON "AIUsageLog"("feature");

-- CreateIndex
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "PageViewLog_clubSlug_idx" ON "PageViewLog"("clubSlug");

-- CreateIndex
CREATE INDEX "PageViewLog_createdAt_idx" ON "PageViewLog"("createdAt");

-- CreateIndex
CREATE INDEX "PageViewLog_clubSlug_createdAt_idx" ON "PageViewLog"("clubSlug", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSpecialRole" ADD CONSTRAINT "MemberSpecialRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSpecialRole" ADD CONSTRAINT "MemberSpecialRole_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_savedLocationId_fkey" FOREIGN KEY ("savedLocationId") REFERENCES "SavedLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_blindStructureId_fkey" FOREIGN KEY ("blindStructureId") REFERENCES "BlindStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_chipSetId_fkey" FOREIGN KEY ("chipSetId") REFERENCES "ChipSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindStructure" ADD CONSTRAINT "BlindStructure_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindLevel" ADD CONSTRAINT "BlindLevel_blindStructureId_fkey" FOREIGN KEY ("blindStructureId") REFERENCES "BlindStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blindStructureId_fkey" FOREIGN KEY ("blindStructureId") REFERENCES "BlindStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_chipSetId_fkey" FOREIGN KEY ("chipSetId") REFERENCES "ChipSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTable" ADD CONSTRAINT "GameTable_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalty" ADD CONSTRAINT "Penalty_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipSet" ADD CONSTRAINT "ChipSet_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipDenomination" ADD CONSTRAINT "ChipDenomination_chipSetId_fkey" FOREIGN KEY ("chipSetId") REFERENCES "ChipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipDenominationChange" ADD CONSTRAINT "ChipDenominationChange_chipDenominationId_fkey" FOREIGN KEY ("chipDenominationId") REFERENCES "ChipDenomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipScan" ADD CONSTRAINT "ChipScan_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipScan" ADD CONSTRAINT "ChipScan_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipScan" ADD CONSTRAINT "ChipScan_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipScan" ADD CONSTRAINT "ChipScan_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesRecord" ADD CONSTRAINT "DuesRecord_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesRecord" ADD CONSTRAINT "DuesRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryBalance" ADD CONSTRAINT "TreasuryBalance_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerBalance" ADD CONSTRAINT "PlayerBalance_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trophy" ADD CONSTRAINT "Trophy_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrophyAward" ADD CONSTRAINT "TrophyAward_trophyId_fkey" FOREIGN KEY ("trophyId") REFERENCES "Trophy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrophyAward" ADD CONSTRAINT "TrophyAward_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrophyAward" ADD CONSTRAINT "TrophyAward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubFeatureFlag" ADD CONSTRAINT "ClubFeatureFlag_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referredPerson_fkey" FOREIGN KEY ("referredPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referralSource_fkey" FOREIGN KEY ("referredPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkEdge" ADD CONSTRAINT "NetworkEdge_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkEdge" ADD CONSTRAINT "NetworkEdge_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueProfile" ADD CONSTRAINT "VenueProfile_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkInEntry" ADD CONSTRAINT "WalkInEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkInEntry" ADD CONSTRAINT "WalkInEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkInEntry" ADD CONSTRAINT "WalkInEntry_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circuit" ADD CONSTRAINT "Circuit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitVenue" ADD CONSTRAINT "CircuitVenue_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitVenue" ADD CONSTRAINT "CircuitVenue_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitSeason" ADD CONSTRAINT "CircuitSeason_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitMember" ADD CONSTRAINT "CircuitMember_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitMember" ADD CONSTRAINT "CircuitMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitStanding" ADD CONSTRAINT "CircuitStanding_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "CircuitSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitStanding" ADD CONSTRAINT "CircuitStanding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
