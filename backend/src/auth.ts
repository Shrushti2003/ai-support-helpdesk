import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';
import { env } from './config.js';
import { Role } from '@prisma/client';
export type SessionUser = { id: string; role: Role; name: string; email: string };
const cookie = 'helpdesk_session';
const sign = (value: string) => crypto.createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url');
export function setSession(res: Response, user: SessionUser) { const value = Buffer.from(JSON.stringify(user)).toString('base64url'); res.cookie(cookie, `${value}.${sign(value)}`, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7 }); }
export function clearSession(res: Response) { res.clearCookie(cookie); }
export async function getSession(req: Request): Promise<SessionUser | null> { try { const raw = req.cookies?.[cookie]; if (!raw) return null; const [value, signature] = raw.split('.'); const expected = value ? sign(value) : ''; if (!value || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; const candidate = JSON.parse(Buffer.from(value, 'base64url').toString()) as SessionUser; const user = await prisma.user.findUnique({ where: { id: candidate.id } }); return user?.active ? { id: user.id, role: user.role, name: user.name, email: user.email } : null; } catch { return null; } }
export function requireAuth(roles?: Role[]) { return async (req: Request, res: Response, next: NextFunction) => { const user = await getSession(req); if (!user) return res.status(401).json({ error: 'Authentication required' }); if (roles && !roles.includes(user.role)) return res.status(403).json({ error: 'Insufficient permissions' }); req.user = user; next(); }; }
declare global { namespace Express { interface Request { user?: SessionUser } } }
