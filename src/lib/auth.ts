import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "fowww_admin";
const MAX_AGE = 60 * 60 * 24 * 14;

export function adminPassword() {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : "fowww";
}

function secret() {
  const configured = process.env.ADMIN_SECRET;
  if (configured) return configured;

  const password = adminPassword();
  if (password) return `fowww-xp-${password}`;

  throw new Error("ADMIN_SECRET is required in production");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function makeToken() {
  const issued = String(Date.now());
  return `${issued}.${sign(issued)}`;
}

function verifyToken(token: string | undefined) {
  if (!token) return false;

  try {
    const [issued, signature] = token.split(".");
    if (!issued || !signature) return false;
    const issuedAt = Number(issued);
    if (!Number.isFinite(issuedAt)) return false;

    const expected = sign(issued);
    if (expected.length !== signature.length) return false;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
    return Date.now() - issuedAt < MAX_AGE * 1000;
  } catch {
    return false;
  }
}

export function checkPassword(input: string) {
  const expected = adminPassword();
  if (!expected || typeof input !== "string" || input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function isAdmin() {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export async function startSession() {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function forbidden() {
  return Response.json({ ok: false, error: "Доступ запрещён" }, { status: 401 });
}
