import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireTripLeader, requireTripViewer } from "./lib/auth";

const FINANCE_CURRENCY = "CZK";
const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "excused"] as const;
const CATEGORY_ORDER = ["transport", "food", "accommodation", "materials", "other"] as const;

const SUBCATEGORY_MAP = {
    transport: ["outbound", "return", "local", "extra"],
    food: ["snacks", "breakfast", "lunch", "dinner", "drinks", "shared_purchase", "reserve"],
    accommodation: ["lodging", "energy", "deposit", "cleaning", "extra_fees"],
    materials: ["program", "first_aid", "consumables", "printing", "rewards", "repairs"],
    other: ["entry_fees", "insurance", "reserve", "unexpected"],
} as const;

type FinanceCategory = keyof typeof SUBCATEGORY_MAP;
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type BudgetItemDoc = Doc<"trip_budget_items">;
type PaymentDoc = Doc<"trip_member_payments">;

function nowIso() {
    return new Date().toISOString();
}

function toNonNegativeInteger(value?: number | null) {
    if (value === undefined || value === null) return undefined;
    if (!Number.isFinite(value) || value < 0) {
        throw new Error("Částka musí být nezáporné číslo.");
    }
    return Math.round(value);
}

function toNonNegativeNumber(value?: number | null) {
    if (value === undefined || value === null) return undefined;
    if (!Number.isFinite(value) || value < 0) {
        throw new Error("Hodnota musí být nezáporné číslo.");
    }
    return value;
}

function assertCategory(category: string): asserts category is FinanceCategory {
    if (!(category in SUBCATEGORY_MAP)) {
        throw new Error("Neplatná kategorie rozpočtu.");
    }
}

function assertSubcategory(category: FinanceCategory, subcategory: string) {
    if (!SUBCATEGORY_MAP[category].includes(subcategory as never)) {
        throw new Error("Neplatná podkategorie pro zvolenou kategorii.");
    }
}

function assertPaymentStatus(status: string): asserts status is PaymentStatus {
    if (!(PAYMENT_STATUSES as readonly string[]).includes(status)) {
        throw new Error("Neplatný stav platby.");
    }
}

function getCategorySortIndex(category: string) {
    const index = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
    return index === -1 ? CATEGORY_ORDER.length : index;
}

function sortBudgetItems(items: BudgetItemDoc[]) {
    return [...items].sort((a, b) => {
        const catDiff = getCategorySortIndex(a.category) - getCategorySortIndex(b.category);
        if (catDiff !== 0) return catDiff;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.createdAt.localeCompare(b.createdAt);
    });
}

async function getFinanceState(ctx: QueryCtx | MutationCtx, tripId: Id<"trips">) {
    const trip = await ctx.db.get(tripId);
    if (!trip) throw new Error("Výprava nebyla nalezena.");

    const budgetItemsRaw = await ctx.db
        .query("trip_budget_items")
        .withIndex("by_trip", (q) => q.eq("tripId", tripId))
        .collect();
    const budgetItems = sortBudgetItems(budgetItemsRaw);

    const participations = await ctx.db
        .query("participations")
        .withIndex("by_trip", (q) => q.eq("tripId", tripId))
        .collect();
    const attendingParticipations = participations.filter((row: Doc<"participations">) => row.status === "attending");
    const activeMemberIds = new Set(attendingParticipations.map((row: Doc<"participations">) => row.memberId));

    const allPayments = await ctx.db
        .query("trip_member_payments")
        .withIndex("by_trip", (q) => q.eq("tripId", tripId))
        .collect();
    const activePayments = allPayments.filter((row: PaymentDoc) => activeMemberIds.has(row.memberId));

    const membersById = new Map<string, Doc<"members">>();
    for (const participation of attendingParticipations) {
        const member = await ctx.db.get(participation.memberId);
        if (member) membersById.set(String(member._id), member);
    }

    const financeSettings = {
        currency: trip.financeSettings?.currency || FINANCE_CURRENCY,
        manualPricePerParticipant: trip.financeSettings?.manualPricePerParticipant,
        paymentDueDate: trip.financeSettings?.paymentDueDate,
        useManualParticipantPrice: trip.financeSettings?.useManualParticipantPrice ?? false,
        notes: trip.financeSettings?.notes,
    };

    const plannedTotal = budgetItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
    const actualTotal = budgetItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
    const participantCount = attendingParticipations.length;
    const payingParticipantCount = Math.max(
        0,
        participantCount - activePayments.filter((payment: PaymentDoc) => payment.status === "excused").length
    );
    const calculatedPricePerParticipant =
        payingParticipantCount > 0 ? Math.ceil(plannedTotal / payingParticipantCount) : 0;
    const manualPricePerParticipant =
        typeof financeSettings.manualPricePerParticipant === "number"
            ? financeSettings.manualPricePerParticipant
            : undefined;
    const effectivePricePerParticipant =
        financeSettings.useManualParticipantPrice && typeof manualPricePerParticipant === "number"
            ? manualPricePerParticipant
            : calculatedPricePerParticipant;
    const expectedRevenue = activePayments.reduce((sum: number, payment: PaymentDoc) => {
        if (payment.status === "excused") return sum;
        return sum + (payment.expectedAmount || 0);
    }, 0);
    const collectedRevenue = activePayments.reduce(
        (sum: number, payment: PaymentDoc) => sum + (payment.paidAmount || 0),
        0
    );
    const outstandingRevenue = expectedRevenue - collectedRevenue;
    const balancePlanned = expectedRevenue - plannedTotal;
    const balanceActual = collectedRevenue - actualTotal;

    const payments = await Promise.all(
        activePayments.map(async (payment: PaymentDoc) => {
            const member = membersById.get(String(payment.memberId)) || (await ctx.db.get(payment.memberId));
            return {
                ...payment,
                member,
            };
        })
    );

    payments.sort((a, b) => (a.member?.name || "").localeCompare(b.member?.name || "", "cs"));

    return {
        trip,
        financeSettings,
        budgetItems,
        payments,
        summary: {
            plannedTotal,
            actualTotal,
            participantCount,
            payingParticipantCount,
            calculatedPricePerParticipant,
            manualPricePerParticipant,
            effectivePricePerParticipant,
            expectedRevenue,
            collectedRevenue,
            outstandingRevenue,
            balancePlanned,
            balanceActual,
        },
    };
}

export const getDashboard = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await requireTripViewer(ctx, args.tripId);
        const state = await getFinanceState(ctx, args.tripId);
        return {
            financeSettings: state.financeSettings,
            budgetItems: state.budgetItems,
            payments: state.payments,
            summary: state.summary,
        };
    },
});

export const listBudgetItems = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await requireTripViewer(ctx, args.tripId);
        const items = await ctx.db
            .query("trip_budget_items")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();
        return sortBudgetItems(items);
    },
});

export const listPayments = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await requireTripViewer(ctx, args.tripId);
        const state = await getFinanceState(ctx, args.tripId);
        return state.payments;
    },
});

export const updateFinanceSettings = mutation({
    args: {
        tripId: v.id("trips"),
        currency: v.optional(v.string()),
        manualPricePerParticipant: v.optional(v.union(v.number(), v.null())),
        paymentDueDate: v.optional(v.union(v.string(), v.null())),
        useManualParticipantPrice: v.optional(v.boolean()),
        notes: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        await requireTripLeader(ctx, args.tripId);
        const trip = await ctx.db.get(args.tripId);
        if (!trip) throw new Error("Výprava nebyla nalezena.");

        const financeSettings = {
            currency: FINANCE_CURRENCY,
            manualPricePerParticipant: toNonNegativeInteger(args.manualPricePerParticipant),
            paymentDueDate: args.paymentDueDate || undefined,
            useManualParticipantPrice: args.useManualParticipantPrice ?? false,
            notes: args.notes || undefined,
        };

        await ctx.db.patch(args.tripId, {
            financeSettings,
        });
    },
});

export const addBudgetItem = mutation({
    args: {
        tripId: v.id("trips"),
        category: v.string(),
        subcategory: v.string(),
        name: v.string(),
        plannedAmount: v.optional(v.number()),
        actualAmount: v.optional(v.number()),
        quantity: v.optional(v.number()),
        unitLabel: v.optional(v.string()),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireTripLeader(ctx, args.tripId);
        const name = args.name.trim();
        if (!name) throw new Error("Název položky je povinný.");
        assertCategory(args.category);
        assertSubcategory(args.category, args.subcategory);

        const existingInCategory = await ctx.db
            .query("trip_budget_items")
            .withIndex("by_trip_category", (q) => q.eq("tripId", args.tripId).eq("category", args.category))
            .collect();
        const sortOrder = existingInCategory.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
        const timestamp = nowIso();

        return await ctx.db.insert("trip_budget_items", {
            tripId: args.tripId,
            category: args.category,
            subcategory: args.subcategory,
            name,
            plannedAmount: toNonNegativeInteger(args.plannedAmount),
            actualAmount: toNonNegativeInteger(args.actualAmount),
            quantity: toNonNegativeNumber(args.quantity),
            unitLabel: args.unitLabel?.trim() || undefined,
            note: args.note?.trim() || undefined,
            sortOrder,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    },
});

export const updateBudgetItem = mutation({
    args: {
        itemId: v.id("trip_budget_items"),
        subcategory: v.optional(v.string()),
        name: v.optional(v.string()),
        plannedAmount: v.optional(v.union(v.number(), v.null())),
        actualAmount: v.optional(v.union(v.number(), v.null())),
        quantity: v.optional(v.union(v.number(), v.null())),
        unitLabel: v.optional(v.union(v.string(), v.null())),
        note: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.itemId);
        if (!item) throw new Error("Položka rozpočtu nebyla nalezena.");
        await requireTripLeader(ctx, item.tripId);

        const patch: Partial<BudgetItemDoc> = {
            updatedAt: nowIso(),
        };

        if (args.subcategory !== undefined) {
            assertCategory(item.category);
            assertSubcategory(item.category, args.subcategory);
            patch.subcategory = args.subcategory;
        }
        if (args.name !== undefined) {
            const name = args.name.trim();
            if (!name) throw new Error("Název položky je povinný.");
            patch.name = name;
        }
        if (args.plannedAmount !== undefined) patch.plannedAmount = toNonNegativeInteger(args.plannedAmount);
        if (args.actualAmount !== undefined) patch.actualAmount = toNonNegativeInteger(args.actualAmount);
        if (args.quantity !== undefined) patch.quantity = toNonNegativeNumber(args.quantity);
        if (args.unitLabel !== undefined) patch.unitLabel = args.unitLabel?.trim() || undefined;
        if (args.note !== undefined) patch.note = args.note?.trim() || undefined;

        await ctx.db.patch(args.itemId, patch);
    },
});

export const removeBudgetItem = mutation({
    args: { itemId: v.id("trip_budget_items") },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.itemId);
        if (!item) return;
        await requireTripLeader(ctx, item.tripId);
        await ctx.db.delete(args.itemId);
    },
});

export const reorderBudgetItems = mutation({
    args: {
        tripId: v.id("trips"),
        category: v.string(),
        itemIds: v.array(v.id("trip_budget_items")),
    },
    handler: async (ctx, args) => {
        await requireTripLeader(ctx, args.tripId);
        assertCategory(args.category);
        const items = await ctx.db
            .query("trip_budget_items")
            .withIndex("by_trip_category", (q) => q.eq("tripId", args.tripId).eq("category", args.category))
            .collect();
        const itemMap = new Map(items.map((item) => [String(item._id), item]));
        if (args.itemIds.length !== items.length) {
            throw new Error("Pořadí musí obsahovat všechny položky kategorie.");
        }

        for (let index = 0; index < args.itemIds.length; index += 1) {
            const itemId = args.itemIds[index];
            const item = itemMap.get(String(itemId));
            if (!item) throw new Error("Pořadí obsahuje neplatnou položku.");
            await ctx.db.patch(itemId, {
                sortOrder: index,
                updatedAt: nowIso(),
            });
        }
    },
});

export const ensurePaymentRows = mutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await requireTripLeader(ctx, args.tripId);
        const state = await getFinanceState(ctx, args.tripId);
        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();
        const attending = participations.filter((row: Doc<"participations">) => row.status === "attending");
        const existing = await ctx.db
            .query("trip_member_payments")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();
        const existingByMemberId = new Map(existing.map((row) => [String(row.memberId), row]));
        let createdCount = 0;

        for (const participation of attending) {
            if (existingByMemberId.has(String(participation.memberId))) continue;
            await ctx.db.insert("trip_member_payments", {
                tripId: args.tripId,
                memberId: participation.memberId,
                status: "unpaid",
                expectedAmount: state.summary.effectivePricePerParticipant,
                paidAmount: 0,
                updatedAt: nowIso(),
            });
            createdCount += 1;
        }

        return { createdCount };
    },
});

export const updateMemberPayment = mutation({
    args: {
        paymentId: v.id("trip_member_payments"),
        status: v.optional(v.string()),
        expectedAmount: v.optional(v.union(v.number(), v.null())),
        paidAmount: v.optional(v.union(v.number(), v.null())),
        paidAt: v.optional(v.union(v.string(), v.null())),
        note: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        const payment = await ctx.db.get(args.paymentId);
        if (!payment) throw new Error("Platba nebyla nalezena.");
        await requireTripLeader(ctx, payment.tripId);

        const patch: Partial<PaymentDoc> = {
            updatedAt: nowIso(),
        };

        if (args.status !== undefined) {
            assertPaymentStatus(args.status);
            patch.status = args.status;
            if (args.status === "excused" && args.expectedAmount === undefined) {
                patch.expectedAmount = 0;
            }
        }
        if (args.expectedAmount !== undefined) patch.expectedAmount = toNonNegativeInteger(args.expectedAmount);
        if (args.paidAmount !== undefined) patch.paidAmount = toNonNegativeInteger(args.paidAmount);
        if (args.paidAt !== undefined) patch.paidAt = args.paidAt || undefined;
        if (args.note !== undefined) patch.note = args.note?.trim() || undefined;

        await ctx.db.patch(args.paymentId, patch);
    },
});

export const bulkSetExpectedAmounts = mutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await requireTripLeader(ctx, args.tripId);
        const state = await getFinanceState(ctx, args.tripId);
        let updatedCount = 0;

        for (const payment of state.payments) {
            if (payment.status === "excused") continue;
            await ctx.db.patch(payment._id, {
                expectedAmount: state.summary.effectivePricePerParticipant,
                updatedAt: nowIso(),
            });
            updatedCount += 1;
        }

        return { updatedCount };
    },
});
