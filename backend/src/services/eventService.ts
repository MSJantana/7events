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
};
