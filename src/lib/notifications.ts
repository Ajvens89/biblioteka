import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function notifyUser(params: {
  userId: string;
  email: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  emailSubject?: string;
  emailHtml?: string;
}) {
  const profile = await prisma.profile.findUnique({
    where: { id: params.userId },
    select: { emailNotificationsEnabled: true },
  });

  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl ?? null,
    },
  });

  if (params.emailSubject && params.emailHtml && profile?.emailNotificationsEnabled !== false) {
    const sent = await sendEmail({
      to: params.email,
      subject: params.emailSubject,
      html: params.emailHtml,
    });
    if (sent) {
      await prisma.notification.updateMany({
        where: { userId: params.userId, title: params.title },
        data: { sentEmail: true },
      });
    }
  }
}
