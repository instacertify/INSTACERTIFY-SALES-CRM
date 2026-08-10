import { prisma } from "@/lib/prisma";

export async function notifyUsers(
  userIds: string[],
  title: string,
  message: string,
  link?: string,
) {
  if (!userIds.length) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      link,
    })),
  });
}

export async function notifyAllStaff(
  title: string,
  message: string,
  link?: string,
) {
  const users = await prisma.user.findMany({ select: { id: true } });
  await notifyUsers(
    users.map((u) => u.id),
    title,
    message,
    link,
  );
}

export async function notifyAdmins(
  title: string,
  message: string,
  link?: string,
) {
  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    title,
    message,
    link,
  );
}
