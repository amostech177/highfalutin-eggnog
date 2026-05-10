import { WalletTransaction } from '../models/WalletTransaction.js';
import { User } from '../models/User.js';

export function isTrialActive(user) {
  const now = Date.now();
  return user.trial?.startsAt && user.trial?.endsAt && now >= +user.trial.startsAt && now <= +user.trial.endsAt;
}

export function canUseWithinTrial(user, kind) {
  if (!isTrialActive(user)) return false;
  const caps = user.trial?.caps ?? {};
  const usage = user.usage ?? {};
  if (kind === 'leads') return (usage.leads ?? 0) < (caps.leads ?? 0);
  if (kind === 'emails') return (usage.emails ?? 0) < (caps.emails ?? 0);
  if (kind === 'funnelsPublished') return (usage.funnelsPublished ?? 0) < (caps.funnelsPublished ?? 0);
  return false;
}

export async function incrementUsage(userId, kind, by = 1) {
  const path = `usage.${kind}`;
  await User.updateOne({ _id: userId }, { $inc: { [path]: by } });
}

export async function ensureCanConsume(userId, kind, creditsCost) {
  const user = await User.findById(userId);
  if (!user) return { ok: false, status: 404, message: 'User not found' };

  // Trial path: allow limited usage without charging wallet.
  if (kind === 'leads' && canUseWithinTrial(user, 'leads')) return { ok: true, mode: 'trial' };
  if (kind === 'emails' && canUseWithinTrial(user, 'emails')) return { ok: true, mode: 'trial' };
  if (kind === 'funnelsPublished' && canUseWithinTrial(user, 'funnelsPublished')) return { ok: true, mode: 'trial' };

  const balance = user.wallet?.balance ?? 0;
  if (balance < creditsCost) {
    return { ok: false, status: 402, message: 'Insufficient balance. Please top up.' };
  }
  return { ok: true, mode: 'wallet' };
}

export async function debitWallet({ userId, amount, reason, reference, meta = {} }) {
  // Idempotent: unique (userId, reference)
  await WalletTransaction.create({ userId, type: 'debit', amount, reason, reference, meta });
  await User.updateOne({ _id: userId }, { $inc: { 'wallet.balance': -amount } });
}

export async function creditWallet({ userId, amount, reason, reference, meta = {} }) {
  await WalletTransaction.create({ userId, type: 'credit', amount, reason, reference, meta });
  await User.updateOne({ _id: userId }, { $inc: { 'wallet.balance': amount } });
}

