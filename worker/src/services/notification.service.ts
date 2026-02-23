import prisma from '../config/prisma';
import redisClient from '../config/redis';

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'VERIFICATION';

export class NotificationService {
  static async createNotification({
    userId,
    type,
    message,
    link,
    senderId,
    postId,
    commentId
  }: {
    userId: string;
    type: NotificationType;
    message: string;
    link?: string;
    senderId?: string;
    postId?: string;
    commentId?: string;
  }) {
    try {
      // Don't notify yourself
      if (userId === senderId) return null;

      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          message,
          link,
          senderId,
          postId,
          commentId
        }
      });

      // Publish to Redis for real-time SSE
      await redisClient.publish(`notifications:${userId}`, JSON.stringify(notification));
      
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  static async notifyLike(senderId: string, { postId, commentId }: { postId?: string; commentId?: string }) {
    try {
      const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
      const senderName = sender?.name || 'Someone';

      if (postId) {
        const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true, content: true } });
        if (post) {
          await this.createNotification({
            userId: post.userId,
            type: 'LIKE',
            message: `${senderName} liked your post: "${post.content.substring(0, 30)}..."`,
            link: `/post/${postId}`,
            senderId,
            postId
          });
        }
      } else if (commentId) {
        const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true, content: true, postId: true } });
        if (comment) {
          await this.createNotification({
            userId: comment.userId,
            type: 'LIKE',
            message: `${senderName} liked your comment: "${comment.content.substring(0, 30)}..."`,
            link: comment.postId ? `/post/${comment.postId}` : undefined,
            senderId,
            commentId
          });
        }
      }
    } catch (error) {
      console.error('Error in notifyLike:', error);
    }
  }

  static async notifyComment(senderId: string, { postId, content }: { postId: string; content: string }) {
    try {
      const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
      const senderName = sender?.name || 'Someone';

      const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true, content: true } });
      if (post) {
        await this.createNotification({
          userId: post.userId,
          type: 'COMMENT',
          message: `${senderName} commented on your post: "${content.substring(0, 30)}..."`,
          link: `/post/${postId}`,
          senderId,
          postId
        });
      }
    } catch (error) {
      console.error('Error in notifyComment:', error);
    }
  }
}
