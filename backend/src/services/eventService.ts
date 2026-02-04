import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

export const eventService = {
  async listEvents(status?: "PUBLISHED" | "DRAFT" | "CANCELED" | "FINALIZED" | string[]) {
    const where: any = {}
    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status }
      } else {
        where.status = status
      }
    }
    return prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: { ticketTypes: true },
    });
  },

  async getEventById(id: string) {
    return prisma.event.findUnique({ where: { id } });
  },

  async createEvent(data: Prisma.EventCreateInput) {
    return prisma.event.create({ data });
  },

  async updateEvent(id: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({ where: { id }, data });
  },

  async publishEvent(id: string) {
    return prisma.event.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });
  },

  async cancelEvent(id: string) {
    return prisma.event.update({ where: { id }, data: { status: "CANCELED" } });
  },

  async addReview(eventId: string, userId: string, rating: number, comment?: string) {
    await prisma.review.upsert({
      where: {
        eventId_userId: { eventId, userId }
      },
      update: { rating, comment },
      create: { eventId, userId, rating, comment }
    });

    const agg = await prisma.review.aggregate({
      where: { eventId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    const avg = agg._avg.rating || 0;
    const count = agg._count.rating || 0;

    return prisma.event.update({
      where: { id: eventId },
      data: {
        averageRating: avg,
        reviewCount: count
      }
    });
  },
};
