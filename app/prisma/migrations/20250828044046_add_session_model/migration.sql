-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
