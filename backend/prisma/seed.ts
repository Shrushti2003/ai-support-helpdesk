import { PrismaClient, Role, Category, Priority, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { name: 'Admin User', email: 'admin@example.com', passwordHash, role: Role.ADMIN } }),
    prisma.user.upsert({ where: { email: 'agent@example.com' }, update: {}, create: { name: 'Alex Agent', email: 'agent@example.com', passwordHash, role: Role.AGENT } }),
    prisma.user.upsert({ where: { email: 'agent2@example.com' }, update: {}, create: { name: 'Sam Support', email: 'agent2@example.com', passwordHash, role: Role.AGENT } }),
    prisma.user.upsert({ where: { email: 'customer@example.com' }, update: {}, create: { name: 'Casey Customer', email: 'customer@example.com', passwordHash, role: Role.CUSTOMER } })
  ]);
  const customer = users[3]; const agent = users[1];
  if (await prisma.ticket.count() === 0) {
    const ticket = await prisma.ticket.create({ data: { subject: 'Unable to update billing address', description: 'The billing page returns an error when I save a new address.', category: Category.BILLING, priority: Priority.HIGH, status: TicketStatus.IN_PROGRESS, customerId: customer.id, assignedAgentId: agent.id, firstResponseDeadline: new Date(Date.now() + 2 * 3600000) } });
    await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorId: customer.id, content: ticket.description } });
  }
}
main().finally(() => prisma.$disconnect());
