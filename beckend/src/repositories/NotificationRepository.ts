import { prisma } from '../lib/prisma';
import { Prisma, Notification } from '@prisma/client';

export class NotificationRepository {
  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return await prisma.notification.create({ data });
  }

  async findUnreadByUserId(userId: number): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markAsRead(id: string): Promise<void> {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }
}