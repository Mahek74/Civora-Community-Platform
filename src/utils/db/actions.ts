"use server"

import { db } from './dbConfig';
import { Users, Reports, Rewards, CollectedWastes, Notifications, Transactions, EmergencyReports } from './schema';
import { eq, sql, and, desc, ne } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// ── In-memory cache to reduce repeated DB round-trips ──
const userCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function clearUserCache(email?: string) {
  if (email) userCache.delete(email);
  else userCache.clear();
}

// ── Password hashing — bcrypt (cost factor 12) ──
// Legacy SHA-256 hashes are identified by NOT starting with '$2b$'
// Auto-migration: on first login with correct old password, hash is upgraded to bcrypt
const BCRYPT_ROUNDS = 12;

async function hashPasswordBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function isLegacySHA256Hash(hash: string): boolean {
  // Legacy format: "<hex_salt>:<hex_hash>" (does not start with $2b$)
  return !hash.startsWith('$2b$') && hash.includes(':');
}

function verifyLegacySHA256(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = createHash('sha256').update(password + salt).digest('hex');
  return computed === hash;
}

// Legacy createUser (no password — used by demo setup and backward compat)
export async function createUser(email: string, name: string) {
  try {
    const [user] = await db.insert(Users).values({ email, name }).returning().execute();
    if (user) userCache.set(email, { data: user, ts: Date.now() });
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

// ── Real auth: signup with bcrypt password (public signups strictly create citizen accounts) ──
export async function createUserWithPassword(
  email: string,
  name: string,
  password: string
): Promise<
  | { user: typeof Users.$inferSelect }
  | { error: 'EMAIL_EXISTS' | 'UNKNOWN' }
> {
  try {
    const existing = await getUserByEmail(email);
    if (existing) return { error: 'EMAIL_EXISTS' as const };

    const passwordHash = await hashPasswordBcrypt(password);
    const [user] = await db
      .insert(Users)
      .values({ email, name, passwordHash, role: 'citizen', emailVerified: true })
      .returning()
      .execute();

    return { user };
  } catch (error) {
    console.error("Error creating user with password:", error);
    return { error: 'UNKNOWN' as const };
  }
}

// ── Real auth: login with bcrypt + auto-migration from SHA-256 ──
export async function verifyUserPassword(email: string, password: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(Users)
      .where(sql`lower(${Users.email}) = lower(${normalizedEmail})`)
      .execute();
    if (!user) return { error: 'USER_NOT_FOUND' as const };

    // Case 1: No password stored — do not allow arbitrary passwords
    if (!user.passwordHash) {
      return { error: 'WRONG_PASSWORD' as const };
    }

    // Case 2: Legacy SHA-256 hash — verify then auto-migrate to bcrypt
    if (isLegacySHA256Hash(user.passwordHash)) {
      if (!verifyLegacySHA256(password, user.passwordHash)) {
        return { error: 'WRONG_PASSWORD' as const };
      }
      // Correct password — upgrade hash to bcrypt silently
      const newHash = await hashPasswordBcrypt(password);
      await db.update(Users).set({ passwordHash: newHash }).where(eq(Users.id, user.id)).execute();
      userCache.set(normalizedEmail, { data: { ...user, passwordHash: newHash }, ts: Date.now() });
      return { user };
    }

    // Case 3: Modern bcrypt hash — standard comparison
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return { error: 'WRONG_PASSWORD' as const };

    userCache.set(normalizedEmail, { data: user, ts: Date.now() });
    return { user };
  } catch (error) {
    console.error("Error verifying password:", error);
    return { error: 'UNKNOWN' as const };
  }
}

export async function getUserByEmail(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    // Return cached result if fresh
    const cached = userCache.get(normalizedEmail);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }
    const [user] = await db
      .select()
      .from(Users)
      .where(sql`lower(${Users.email}) = lower(${normalizedEmail})`)
      .execute();
    if (user) userCache.set(normalizedEmail, { data: user, ts: Date.now() });
    return user;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function getUserById(id: number) {
  try {
    const [user] = await db.select().from(Users).where(eq(Users.id, id)).execute();
    return user ?? null;
  } catch (error) {
    console.error("Error fetching user by id:", error);
    return null;
  }
}

// Returns the role for a given user email — used for post-login routing
export async function getUserRole(email: string): Promise<'citizen' | 'admin' | 'worker' | 'volunteer'> {
  try {
    const [user] = await db.select({ role: Users.role }).from(Users).where(eq(Users.email, email)).execute();
    return (user?.role as 'citizen' | 'admin' | 'worker' | 'volunteer') || 'citizen';
  } catch {
    return 'citizen';
  }
}

export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  verificationResult?: any
) {
  try {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const complaintId = `CIV-${year}-${randomNum}`;
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
        verificationResult,
        status: "pending",
        complaintId,
        complaintStatus: "filed",
      })
      .returning()
      .execute();

    // Award 10 points for reporting waste
    const pointsEarned = 10;
    await updateRewardPoints(userId, pointsEarned);

    // Create a transaction for the earned points
    await createTransaction(userId, 'earned_report', pointsEarned, 'Points earned for reporting waste');

    // Create a notification for the user
    await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste!`,
      'reward'
    );

    return report;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

export async function getReportsByUserId(userId: number) {
  try {
    const reports = await db.select().from(Reports).where(eq(Reports.userId, userId)).execute();
    return reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
}

export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db.select().from(Rewards).where(eq(Rewards.userId, userId)).execute();
    if (!reward) {
      [reward] = await db.insert(Rewards).values({
        userId,
        name: 'Default Reward',
        collectionInfo: 'Default Collection Info',
        points: 0,
        level: 1,
        isAvailable: true,
      }).returning().execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}

export async function updateRewardPoints(userId: number, pointsToAdd: number) {
  try {
    const [updatedReward] = await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${pointsToAdd}`,
        updatedAt: new Date()
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();
    return updatedReward;
  } catch (error) {
    console.error("Error updating reward points:", error);
    return null;
  }
}

export async function createCollectedWaste(reportId: number, collectorId: number, notes?: string) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error creating collected waste:", error);
    return null;
  }
}

export async function getCollectedWastesByCollector(collectorId: number) {
  try {
    return await db.select().from(CollectedWastes).where(eq(CollectedWastes.collectorId, collectorId)).execute();
  } catch (error) {
    console.error("Error fetching collected wastes:", error);
    return [];
  }
}

export async function createNotification(userId: number, message: string, type: string) {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({ userId, message, type })
      .returning()
      .execute();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db.select().from(Notifications).where(
      and(
        eq(Notifications.userId, userId),
        eq(Notifications.isRead, false)
      )
    ).execute();
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db.update(Notifications).set({ isRead: true }).where(eq(Notifications.id, notificationId)).execute();
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function getPendingReports() {
  try {
    return await db.select().from(Reports).where(eq(Reports.status, "pending")).execute();
  } catch (error) {
    console.error("Error fetching pending reports:", error);
    return [];
  }
}

export async function updateReportStatus(reportId: number, status: string) {
  try {
    const [updatedReport] = await db
      .update(Reports)
      .set({ status })
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating report status:", error);
    return null;
  }
}

export async function getRecentReports(limit: number = 10) {
  try {
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();
    return reports;
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    return [];
  }
}

export async function getWasteCollectionTasks(limit: number = 20) {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return tasks.map(task => ({
      ...task,
      date: task.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));
  } catch (error) {
    console.error("Error fetching waste collection tasks:", error);
    return [];
  }
}

export async function saveReward(userId: number, amount: number) {
  try {
    const [reward] = await db
      .insert(Rewards)
      .values({
        userId,
        name: 'Waste Collection Reward',
        collectionInfo: 'Points earned from waste collection',
        points: amount,
        level: 1,
        isAvailable: true,
      })
      .returning()
      .execute();

    // Create a transaction for this reward
    await createTransaction(userId, 'earned_collect', amount, 'Points earned for collecting waste');

    return reward;
  } catch (error) {
    console.error("Error saving reward:", error);
    throw error;
  }
}

export async function saveCollectedWaste(reportId: number, collectorId: number, verificationResult: any) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: 'verified',
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error saving collected waste:", error);
    throw error;
  }
}

export async function updateTaskStatus(reportId: number, newStatus: string, collectorId?: number) {
  try {
    const updateData: any = { status: newStatus };
    if (collectorId !== undefined) {
      updateData.collectorId = collectorId;
    }
    const [updatedReport] = await db
      .update(Reports)
      .set(updateData)
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}

export async function getRewardTransactions(userId: number) {
  try {
    console.log('Fetching transactions for user ID:', userId)
    const transactions = await db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    console.log('Raw transactions from database:', transactions)

    const formattedTransactions = transactions.map(t => ({
      ...t,
      date: t.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));

    console.log('Formatted transactions:', formattedTransactions)
    return formattedTransactions;
  } catch (error) {
    console.error("Error fetching reward transactions:", error);
    return [];
  }
}

export async function getAvailableRewards(userId: number) {
  try {
    console.log('Fetching available rewards for user:', userId);

    // Get user's total points
    const userTransactions = await getRewardTransactions(userId);
    const userPoints = userTransactions.reduce((total, transaction) => {
      return transaction.type.startsWith('earned') ? total + transaction.amount : total - transaction.amount;
    }, 0);

    console.log('User total points:', userPoints);

    // Get available rewards from the database
    let dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    // Auto-seed default rewards if none exist
    if (dbRewards.length === 0) {
      await db.insert(Rewards).values([
        {
          name: "♻️ Eco Badge",
          points: 500,
          description: "Official CivicPulse Eco Verified Badge",
          collectionInfo: "Digital Eco Verified Badge",
          isAvailable: true,
        },
        {
          name: "🌱 Tree Plantation",
          points: 1000,
          description: "Plant a real tree in local reforestation drive",
          collectionInfo: "Certificate & Tree Geotag",
          isAvailable: true,
        },
        {
          name: "🎁 Eco Kit",
          points: 2000,
          description: "Stainless Steel Bottle, Bamboo Toothbrush & Tote Bag",
          collectionInfo: "Home Delivery",
          isAvailable: true,
        },
      ]).execute();

      dbRewards = await db
        .select({
          id: Rewards.id,
          name: Rewards.name,
          cost: Rewards.points,
          description: Rewards.description,
          collectionInfo: Rewards.collectionInfo,
        })
        .from(Rewards)
        .where(eq(Rewards.isAvailable, true))
        .execute();
    }

    console.log('Rewards from database:', dbRewards);

    // Combine user points and database rewards
    const allRewards = [
      {
        id: 0, // Use a special ID for user's points
        name: "Your Points",
        cost: userPoints,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste"
      },
      ...dbRewards
    ];

    console.log('All available rewards:', allRewards);
    return allRewards;
  } catch (error) {
    console.error("Error fetching available rewards:", error);
    return [];
  }
}

export async function createTransaction(
  userId: number,
  type: 'earned_report' | 'earned_collect' | 'redeemed' | string,
  amount: number,
  description: string,
  referenceKey?: string
) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({ userId, type: type as any, amount, description, referenceKey })
      .returning()
      .execute();
    return transaction;
  } catch (error: any) {
    if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('reference_key')) {
      console.log(`[Idempotency] Duplicate transaction prevented for referenceKey: ${referenceKey}`);
      return { duplicate: true };
    }
    console.error("Error creating transaction:", error);
    throw error;
  }
}

/**
 * Robust, Database-Enforced Idempotent Reward Distribution
 * Uses the UNIQUE constraint on transactions.reference_key as the definitive defense.
 * Attempts to award rewards twice for the same event (e.g. volunteer-task-123) are rejected by PostgreSQL.
 */
export async function awardRewardWithIdempotency(
  userId: number,
  amount: number,
  referenceKey: string,
  description: string
) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({
        userId,
        type: 'earned_collect',
        amount,
        description: `${description} [Ref: ${referenceKey}]`,
        referenceKey,
      })
      .returning()
      .execute();

    if (transaction) {
      balanceCache.delete(userId);
      await updateRewardPoints(userId, amount);
      await createNotification(userId, `+${amount} XP: ${description}`, 'reward');
      return { success: true, transaction, duplicate: false };
    }
    return { success: false, duplicate: true };
  } catch (error: any) {
    if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('reference_key')) {
      console.log(`[Idempotency] Duplicate reward claim prevented for referenceKey: ${referenceKey}`);
      return { success: false, duplicate: true };
    }
    console.error("Error awarding reward with idempotency:", error);
    return { success: false, error: 'UNKNOWN', duplicate: false };
  }
}

export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = await getOrCreateReward(userId) as any;

    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db.update(Rewards)
        .set({
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', userReward.points, `Redeemed all points: ${userReward.points}`);

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
      const availableReward = await db.select().from(Rewards).where(eq(Rewards.id, rewardId)).execute();

      if (!userReward || !availableReward[0] || userReward.points < availableReward[0].points) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db.update(Rewards)
        .set({
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', availableReward[0].points, `Redeemed: ${availableReward[0].name}`);

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

// In-memory cache for user balance
const balanceCache = new Map<number, { points: number; ts: number }>();
const BALANCE_CACHE_TTL = 60_000; // 60 seconds

export async function getUserBalance(userId: number): Promise<number> {
  const cached = balanceCache.get(userId);
  if (cached && Date.now() - cached.ts < BALANCE_CACHE_TTL) {
    return cached.points;
  }
  const transactions = await getRewardTransactions(userId);
  const balance = transactions.reduce((acc, transaction) => {
    return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount;
  }, 0);
  const finalBalance = Math.max(balance, 0);
  balanceCache.set(userId, { points: finalBalance, ts: Date.now() });
  return finalBalance;
}

export async function getReportByComplaintId(complaintId: string) {
  try {
    const [report] = await db
      .select()
      .from(Reports)
      .where(eq(Reports.complaintId, complaintId))
      .execute();
    return report;
  } catch (error) {
    console.error("Error fetching report by complaint ID:", error);
    return null;
  }
}

export async function updateComplaintStatus(reportId: number, complaintStatus: string) {
  try {
    const [updatedReport] = await db
      .update(Reports)
      .set({
        complaintStatus,
        ...(complaintStatus === 'resolved' ? { status: 'completed' } : {}),
        ...(complaintStatus === 'in_progress' ? { status: 'verified' } : {})
      })
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating complaint status:", error);
    return null;
  }
}

export async function getAllReports() {
  try {
    return await db.select().from(Reports).execute();
  } catch (error) {
    console.error("Error fetching all reports:", error);
    return [];
  }
}

// ── Admin Analytics: Real aggregated data from Reports table ──
export async function getAnalyticsData() {
  try {
    const reports = await db.select().from(Reports).execute();

    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const resolved = reports.filter(r => r.status === 'completed').length;
    const inProgress = reports.filter(r => r.status === 'in_progress' || r.status === 'verified').length;

    // Ward-wise breakdown
    const wardMap: Record<string, { complaints: number; resolved: number }> = {};
    reports.forEach(r => {
      const ward = r.ward || 'Unknown Ward';
      if (!wardMap[ward]) wardMap[ward] = { complaints: 0, resolved: 0 };
      wardMap[ward].complaints++;
      if (r.status === 'completed') wardMap[ward].resolved++;
    });
    const wardData = Object.entries(wardMap)
      .map(([ward, d]) => ({ ward, complaints: d.complaints, resolved: d.resolved, avgDays: 2.5, trend: '+0%' }))
      .sort((a, b) => b.complaints - a.complaints)
      .slice(0, 5);

    // Waste category breakdown
    const catMap: Record<string, number> = {};
    reports.forEach(r => {
      const cat = r.wasteType || 'Other';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const categoryData = Object.entries(catMap)
      .map(([label, count]) => ({ label, count, pct: Math.round((count / Math.max(total, 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 7-day daily trend
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trendData = days.map((day, i) => {
      const dayReports = reports.filter(r => {
        const d = new Date(r.createdAt);
        return d.getDay() === (i + 1) % 7;
      });
      return {
        day,
        complaints: dayReports.length,
        resolved: dayReports.filter(r => r.status === 'completed').length,
      };
    });

    // Users count
    const users = await db.select().from(Users).execute();

    return { total, pending, resolved, inProgress, wardData, categoryData, trendData, activeUsers: users.length };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return null;
  }
}

// ── Volunteer Dashboard: Pending reports as real tasks ──
export async function getPendingTasksForVolunteer(limit = 10) {
  try {
    const tasks = await db
      .select()
      .from(Reports)
      .where(eq(Reports.status, 'pending'))
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();

    return tasks.map((r, i) => ({
      id: `T${String(r.id).padStart(3, '0')}`,
      complaintId: r.complaintId || `CIV-${r.id}`,
      location: r.location,
      wasteType: r.wasteType,
      severity: r.severity || 'Medium',
      distance: `${((i + 1) * 0.3).toFixed(1)}km`,
      reward: r.severity === 'Critical' ? 50 : r.severity === 'High' ? 30 : r.severity === 'Low' ? 15 : 20,
      status: 'open',
      ward: r.ward || 'General',
      reportId: r.id,
    }));
  } catch (error) {
    console.error("Error fetching volunteer tasks:", error);
    return [];
  }
}

// ── Notifications: All notifications for a user (read + unread) ──
export async function getAllNotificationsForUser(userId: number) {
  try {
    return await db
      .select()
      .from(Notifications)
      .where(eq(Notifications.userId, userId))
      .orderBy(desc(Notifications.createdAt))
      .limit(30)
      .execute();
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    return [];
  }
}

// ── SOS: Recent reports as live area alerts ──
export async function getRecentSosAlerts(limit = 5) {
  try {
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();

    return reports.map(r => ({
      id: r.id,
      category: r.wasteType?.toLowerCase().includes('electric') ? 'electric'
        : r.wasteType?.toLowerCase().includes('water') ? 'water'
          : r.wasteType?.toLowerCase().includes('fire') ? 'fire'
            : 'manhole',
      location: r.location,
      description: `${r.wasteType} — ${r.amount}`,
      time: getTimeAgo(new Date(r.createdAt)),
      status: r.status === 'completed' ? 'resolved' : r.status === 'in_progress' ? 'responding' : 'active',
      distance: '< 2km',
    }));
  } catch (error) {
    console.error("Error fetching SOS alerts:", error);
    return [];
  }
}

function getTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Demo / Recruiter Account Setup ──
export async function setupDemoAccount() {
  try {
    const demoEmail = "demo@civora.org";
    const demoName = "Demo Citizen";

    // 1. Get or create user
    let user = await getUserByEmail(demoEmail);
    if (!user) {
      user = await createUser(demoEmail, demoName);
    }
    if (!user) return null;

    // 2. Ensure default available rewards exist
    const existingRewards = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    if (existingRewards.length === 0) {
      await db.insert(Rewards).values([
        {
          name: "♻️ Eco Badge",
          points: 500,
          description: "Official CivicPulse Eco Verified Badge",
          collectionInfo: "Digital Eco Verified Badge",
          isAvailable: true,
        },
        {
          name: "🌱 Tree Plantation",
          points: 1000,
          description: "Plant a real tree in local reforestation drive",
          collectionInfo: "Certificate & Tree Geotag",
          isAvailable: true,
        },
        {
          name: "🎁 Eco Kit",
          points: 2000,
          description: "Stainless Steel Bottle, Bamboo Toothbrush & Tote Bag",
          collectionInfo: "Home Delivery",
          isAvailable: true,
        },
      ]).execute();
    }

    // 3. Ensure demo user has transactions matching 2,450 XP balance
    const transactions = await db
      .select()
      .from(Transactions)
      .where(eq(Transactions.userId, user.id))
      .execute();

    if (transactions.length === 0) {
      await createTransaction(user.id, 'earned_report', 2275, 'Demo Citizen Welcome Bonus [Ref: INIT-DEMO]');
      await createTransaction(user.id, 'earned_report', 50, 'Waste Report CIV-2026-1024 [Ref: CIV-2026-1024]');
      await createTransaction(user.id, 'earned_collect', 100, 'Waste Collection Civic Drive [Ref: TASK-101]');
      await createTransaction(user.id, 'earned_report', 25, 'Daily Civic Challenge [Ref: CHAL-01]');
    }

    // 4. Seed realistic complaints
    await seedRealisticComplaints(user.id);

    return user;
  } catch (error) {
    console.error("Error setting up demo account:", error);
    return null;
  }
}

export async function setupAdminDemoAccount() {
  try {
    const adminEmail = "admin@civora.org";
    const adminName = "CivicPulse Admin";

    let admin = await getUserByEmail(adminEmail);
    if (!admin) {
      const [newAdmin] = await db.insert(Users).values({
        email: adminEmail,
        name: adminName,
        role: "admin",
      }).returning().execute();
      admin = newAdmin;
      if (admin) userCache.set(adminEmail, { data: admin, ts: Date.now() });
    } else if (admin.role !== 'admin') {
      await db.update(Users).set({ role: 'admin' }).where(eq(Users.id, admin.id)).execute();
      clearUserCache(adminEmail);
    }

    // Ensure sample complaints are seeded
    if (admin) {
      await seedRealisticComplaints(admin.id);
    }

    return admin;
  } catch (error) {
    console.error("Error setting up admin demo account:", error);
    return null;
  }
}

// ── Realistic complaints seeder (~12 realistic reports with coordinates & statuses) ──
export async function seedRealisticComplaints(creatorUserId?: number) {
  try {
    const existing = await db.select().from(Reports).execute();
    if (existing.length >= 8) {
      return existing;
    }

    const uid = creatorUserId || 1;
    const now = Date.now();

    const sampleComplaints = [
      {
        userId: uid,
        location: "Civil Lines Market, Jabalpur",
        wasteType: "Garbage Accumulation",
        amount: "25 kg",
        status: "pending",
        complaintStatus: "filed",
        complaintId: "CIV-2026-1024",
        latitude: "23.1686",
        longitude: "79.9339",
        ward: "Ward 4",
        severity: "High",
        verified: false,
        createdAt: new Date(now - 1000 * 60 * 45), // 45m ago
      },
      {
        userId: uid,
        location: "Wright Town Main Road, Jabalpur",
        wasteType: "Road Damage & Deep Pothole",
        amount: "15 sq.m",
        status: "in_progress",
        complaintStatus: "in_progress",
        complaintId: "CIV-2026-1045",
        latitude: "23.1645",
        longitude: "79.9288",
        ward: "Ward 7",
        severity: "High",
        verified: true,
        assignedWorker: "Ramesh Kumar",
        createdAt: new Date(now - 1000 * 60 * 60 * 3), // 3h ago
      },
      {
        userId: uid,
        location: "Ganjipura Commercial Area, Jabalpur",
        wasteType: "Open Drainage Hazard",
        amount: "50 m",
        status: "pending",
        complaintStatus: "under_review",
        complaintId: "CIV-2026-1082",
        latitude: "23.1725",
        longitude: "79.9412",
        ward: "Ward 12",
        severity: "Critical",
        verified: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 8), // 8h ago
      },
      {
        userId: uid,
        location: "Gorakhpur Main Crossing, Jabalpur",
        wasteType: "Street Light Non-Functional",
        amount: "3 Poles",
        status: "completed",
        complaintStatus: "resolved",
        complaintId: "CIV-2026-1104",
        latitude: "23.1558",
        longitude: "79.9192",
        ward: "Ward 15",
        severity: "Medium",
        verified: true,
        assignedWorker: "Suresh Yadav",
        resolvedAt: new Date(now - 1000 * 60 * 60 * 2),
        createdAt: new Date(now - 1000 * 60 * 60 * 24), // 1d ago
      },
      {
        userId: uid,
        location: "Madan Mahal Station Road, Jabalpur",
        wasteType: "Illegal Plastic Dumping",
        amount: "40 kg",
        status: "pending",
        complaintStatus: "under_review",
        complaintId: "CIV-2026-1129",
        latitude: "23.1500",
        longitude: "79.9070",
        ward: "Ward 9",
        severity: "High",
        verified: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 18),
      },
      {
        userId: uid,
        location: "Napier Town Square, Jabalpur",
        wasteType: "Water Pipeline Burst",
        amount: "Continuous Leak",
        status: "in_progress",
        complaintStatus: "in_progress",
        complaintId: "CIV-2026-1156",
        latitude: "23.1610",
        longitude: "79.9380",
        ward: "Ward 3",
        severity: "Critical",
        verified: true,
        assignedWorker: "Anil Verma",
        createdAt: new Date(now - 1000 * 60 * 60 * 6),
      },
      {
        userId: uid,
        location: "Bhanwar Tal Public Park, Jabalpur",
        wasteType: "Park Littering & Plastic Bottles",
        amount: "12 kg",
        status: "completed",
        complaintStatus: "resolved",
        complaintId: "CIV-2026-1178",
        latitude: "23.1750",
        longitude: "79.9320",
        ward: "Ward 2",
        severity: "Low",
        verified: true,
        assignedWorker: "Priya Kumari",
        resolvedAt: new Date(now - 1000 * 60 * 60 * 5),
        createdAt: new Date(now - 1000 * 60 * 60 * 36),
      },
      {
        userId: uid,
        location: "Sadar Cantt Market, Jabalpur",
        wasteType: "Construction Debris on Footpath",
        amount: "80 kg",
        status: "pending",
        complaintStatus: "filed",
        complaintId: "CIV-2026-1195",
        latitude: "23.1480",
        longitude: "79.9510",
        ward: "Ward 18",
        severity: "Medium",
        verified: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 14),
      },
      {
        userId: uid,
        location: "Adhartal Industrial Bypass, Jabalpur",
        wasteType: "Industrial Scrap Accumulation",
        amount: "65 kg",
        status: "in_progress",
        complaintStatus: "in_progress",
        complaintId: "CIV-2026-1210",
        latitude: "23.2080",
        longitude: "79.9650",
        ward: "Ward 22",
        severity: "High",
        verified: true,
        assignedWorker: "Deepak Singh",
        createdAt: new Date(now - 1000 * 60 * 60 * 12),
      },
      {
        userId: uid,
        location: "Vijay Nagar Sector 2, Jabalpur",
        wasteType: "Hazardous E-Waste & Batteries",
        amount: "8 kg",
        status: "pending",
        complaintStatus: "under_review",
        complaintId: "CIV-2026-1234",
        latitude: "23.1890",
        longitude: "79.9120",
        ward: "Ward 14",
        severity: "Medium",
        verified: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 4),
      },
      {
        userId: uid,
        location: "Ranjhi Main Road, Jabalpur",
        wasteType: "Fallen Tree Branch Blocking Lane",
        amount: "1 Large Branch",
        status: "completed",
        complaintStatus: "resolved",
        complaintId: "CIV-2026-1250",
        latitude: "23.1820",
        longitude: "80.0120",
        ward: "Ward 29",
        severity: "Low",
        verified: true,
        assignedWorker: "Suresh Yadav",
        resolvedAt: new Date(now - 1000 * 60 * 60 * 10),
        createdAt: new Date(now - 1000 * 60 * 60 * 48),
      },
    ];

    await db.insert(Reports).values(sampleComplaints).execute();
    return await db.select().from(Reports).execute();
  } catch (error) {
    console.error("Error seeding realistic complaints:", error);
    return [];
  }
}


// ── Emergency Civic Reporting ────────────────────────────────────

export async function createEmergencyReport(data: {
  userId: number
  hazardType: string
  severity: string
  location: string
  latitude?: string
  longitude?: string
  photoUrl?: string
  description?: string
}) {
  try {
    const [report] = await db
      .insert(EmergencyReports)
      .values({
        userId: data.userId,
        hazardType: data.hazardType,
        severity: data.severity,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: data.photoUrl,
        description: data.description,
        status: 'reported',
      })
      .returning()
      .execute()

    await createNotification(
      data.userId,
      `Your emergency report for '${data.hazardType}' at ${data.location} has been submitted. Status: Reported.`,
      'emergency'
    )

    return report
  } catch (error) {
    console.error('Error creating emergency report:', error)
    return null
  }
}

export async function getEmergencyReportsByUser(userId: number) {
  try {
    return await db
      .select()
      .from(EmergencyReports)
      .where(eq(EmergencyReports.userId, userId))
      .orderBy(desc(EmergencyReports.reportedAt))
      .execute()
  } catch (error) {
    console.error('Error fetching emergency reports:', error)
    return []
  }
}

export async function getAllEmergencyReports() {
  try {
    return await db
      .select()
      .from(EmergencyReports)
      .orderBy(desc(EmergencyReports.reportedAt))
      .execute()
  } catch (error) {
    console.error('Error fetching all emergency reports:', error)
    return []
  }
}

export async function updateEmergencyReportStatus(
  reportId: number,
  status: 'reported' | 'high_priority' | 'assigned' | 'in_progress' | 'resolved',
  assignedTo?: string
) {
  try {
    const updateData: any = { status }
    if (assignedTo) updateData.assignedTo = assignedTo
    if (status === 'resolved') updateData.resolvedAt = new Date()

    const [updated] = await db
      .update(EmergencyReports)
      .set(updateData)
      .where(eq(EmergencyReports.id, reportId))
      .returning()
      .execute()

    return updated
  } catch (error) {
    console.error('Error updating emergency report status:', error)
    return null
  }
}
