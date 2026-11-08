import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { logger } from './logger.js';

export interface PremiumRecord {
    readonly id: string;
    readonly number: string;
    readonly customName?: string;
    readonly addedAt: number;
    readonly expiresAt?: number;
}

export interface UserRecord {
    readonly number: string;
    readonly name: string;
    readonly registered: number;
    readonly registeredAt: number | null;
    readonly limitQuota: number;
    readonly usedLimit: number;
    readonly hasClaimedInitial: number;
    readonly unregisteredAt: number | null;
}

export class AppDatabase {
    private readonly db: Database.Database;

    public constructor(dbFilePath = 'data/enami-asa.sqlite') {
        const resolvedPath = path.resolve(dbFilePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(resolvedPath);
        this.db.pragma('journal_mode = WAL');
        this.initTables();
    }

    private initTables(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS premiums (
                number TEXT PRIMARY KEY,
                custom_name TEXT,
                added_at INTEGER NOT NULL,
                expires_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS settings (
                namespace TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (namespace, key)
            );
            CREATE TABLE IF NOT EXISTS users (
                number TEXT PRIMARY KEY,
                name TEXT,
                registered INTEGER NOT NULL DEFAULT 0,
                registered_at INTEGER,
                limit_quota INTEGER NOT NULL DEFAULT 0,
                used_limit INTEGER NOT NULL DEFAULT 0,
                has_claimed_initial INTEGER NOT NULL DEFAULT 0,
                unregistered_at INTEGER
            );
        `);
    }

    public getSetting(namespace: string, key: string): string | null {
        const stmt = this.db.prepare('SELECT value FROM settings WHERE namespace = ? AND key = ?');
        const row = stmt.get(namespace, key) as { value: string } | undefined;
        return row ? row.value : null;
    }

    public setSetting(namespace: string, key: string, value: string): void {
        const stmt = this.db.prepare(`
            INSERT INTO settings (namespace, key, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(namespace, key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `);
        stmt.run(namespace, key, value, Date.now());
    }

    public deleteSetting(namespace: string, key: string): boolean {
        const stmt = this.db.prepare('DELETE FROM settings WHERE namespace = ? AND key = ?');
        const res = stmt.run(namespace, key);
        return res.changes > 0;
    }

    public isPremium(number: string): boolean {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        if (!cleanNumber) {
            return false;
        }

        const stmt = this.db.prepare(`
            SELECT number, expires_at FROM premiums WHERE number = ?
        `);
        const row = stmt.get(cleanNumber) as { number: string; expires_at?: number | null } | undefined;

        if (!row) {
            return false;
        }

        if (row.expires_at && row.expires_at > 0 && Date.now() > row.expires_at) {
            this.removePremium(cleanNumber);
            return false;
        }

        return true;
    }

    public addPremium(number: string, customName?: string, durationDays?: number): PremiumRecord {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const now = Date.now();
        const expiresAt = durationDays && durationDays > 0 ? now + durationDays * 86400000 : null;

        const stmt = this.db.prepare(`
            INSERT INTO premiums (number, custom_name, added_at, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(number) DO UPDATE SET
                custom_name = excluded.custom_name,
                added_at = excluded.added_at,
                expires_at = excluded.expires_at
        `);

        stmt.run(cleanNumber, customName ?? null, now, expiresAt);

        return {
            id: cleanNumber,
            number: cleanNumber,
            customName: customName ?? undefined,
            addedAt: now,
            expiresAt: expiresAt ?? undefined
        };
    }

    public removePremium(number: string): boolean {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const stmt = this.db.prepare(`DELETE FROM premiums WHERE number = ?`);
        const result = stmt.run(cleanNumber);
        return result.changes > 0;
    }

    public listPremiums(): PremiumRecord[] {
        const stmt = this.db.prepare(`SELECT number, custom_name, added_at, expires_at FROM premiums ORDER BY added_at DESC`);
        const rows = stmt.all() as Array<{
            number: string;
            custom_name: string | null;
            added_at: number;
            expires_at: number | null;
        }>;

        const now = Date.now();
        const active: PremiumRecord[] = [];

        for (const row of rows) {
            if (row.expires_at && row.expires_at > 0 && now > row.expires_at) {
                this.removePremium(row.number);
                continue;
            }
            active.push({
                id: row.number,
                number: row.number,
                customName: row.custom_name ?? undefined,
                addedAt: row.added_at,
                expiresAt: row.expires_at ?? undefined
            });
        }

        return active;
    }

    public getUser(number: string): UserRecord | null {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        if (!cleanNumber) return null;
        const stmt = this.db.prepare(`
            SELECT number, name, registered, registered_at, limit_quota, used_limit, has_claimed_initial, unregistered_at
            FROM users WHERE number = ?
        `);
        const row = stmt.get(cleanNumber) as any;
        if (!row) return null;
        return {
            number: row.number,
            name: row.name || 'User',
            registered: row.registered,
            registeredAt: row.registered_at,
            limitQuota: row.limit_quota,
            usedLimit: row.used_limit,
            hasClaimedInitial: row.has_claimed_initial,
            unregisteredAt: row.unregistered_at
        };
    }

    public registerUser(number: string, name: string, initialLimit: number): { success: boolean; user: UserRecord; alreadyRegistered: boolean } {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const user = this.getUser(cleanNumber);
        if (user && user.registered === 1) {
            return {
                success: true,
                alreadyRegistered: true,
                user
            };
        }
        const now = Date.now();
        if (user) {
            const limitToKeep = user.hasClaimedInitial === 1 ? user.limitQuota : initialLimit;
            const stmt = this.db.prepare(`
                UPDATE users
                SET name = ?, registered = 1, registered_at = ?, limit_quota = ?, has_claimed_initial = 1, unregistered_at = NULL
                WHERE number = ?
            `);
            stmt.run(name || user.name || 'User', now, limitToKeep, cleanNumber);
            return {
                success: true,
                alreadyRegistered: false,
                user: {
                    number: cleanNumber,
                    name: name || user.name || 'User',
                    registered: 1,
                    registeredAt: now,
                    limitQuota: limitToKeep,
                    usedLimit: user.usedLimit,
                    hasClaimedInitial: 1,
                    unregisteredAt: null
                }
            };
        }
        const stmt = this.db.prepare(`
            INSERT INTO users (number, name, registered, registered_at, limit_quota, used_limit, has_claimed_initial, unregistered_at)
            VALUES (?, ?, 1, ?, ?, 0, 1, NULL)
        `);
        stmt.run(cleanNumber, name || 'User', now, initialLimit);
        return {
            success: true,
            alreadyRegistered: false,
            user: {
                number: cleanNumber,
                name: name || 'User',
                registered: 1,
                registeredAt: now,
                limitQuota: initialLimit,
                usedLimit: 0,
                hasClaimedInitial: 1,
                unregisteredAt: null
            }
        };
    }

    public unregisterUser(number: string): { success: boolean; notRegistered: boolean } {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const user = this.getUser(cleanNumber);
        if (!user || user.registered !== 1) {
            return { success: false, notRegistered: true };
        }
        const stmt = this.db.prepare(`
            UPDATE users
            SET registered = 0, unregistered_at = ?, name = 'Unregistered'
            WHERE number = ?
        `);
        stmt.run(Date.now(), cleanNumber);
        return { success: true, notRegistered: false };
    }

    public isRegistered(number: string): boolean {
        const user = this.getUser(number);
        return Boolean(user && user.registered === 1);
    }

    public getUserLimit(number: string): number {
        const user = this.getUser(number);
        return user ? user.limitQuota : 0;
    }

    public deductLimit(number: string, amount: number): boolean {
        if (amount <= 0) return true;
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const stmt = this.db.prepare(`
            UPDATE users
            SET limit_quota = limit_quota - ?, used_limit = used_limit + ?
            WHERE number = ? AND limit_quota >= ?
        `);
        const res = stmt.run(amount, amount, cleanNumber, amount);
        return res.changes > 0;
    }

    public addLimit(number: string, amount: number): boolean {
        if (amount <= 0) return true;
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const user = this.getUser(cleanNumber);
        if (!user) {
            const stmt = this.db.prepare(`
                INSERT INTO users (number, name, registered, registered_at, limit_quota, used_limit, has_claimed_initial, unregistered_at)
                VALUES (?, 'User', 0, NULL, ?, 0, 0, NULL)
            `);
            const res = stmt.run(cleanNumber, amount);
            return res.changes > 0;
        }
        const stmt = this.db.prepare(`
            UPDATE users
            SET limit_quota = limit_quota + ?
            WHERE number = ?
        `);
        const res = stmt.run(amount, cleanNumber);
        return res.changes > 0;
    }

    public setLimit(number: string, amount: number): boolean {
        const cleanNumber = number.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
        const user = this.getUser(cleanNumber);
        if (!user) {
            const stmt = this.db.prepare(`
                INSERT INTO users (number, name, registered, registered_at, limit_quota, used_limit, has_claimed_initial, unregistered_at)
                VALUES (?, 'User', 0, NULL, ?, 0, 0, NULL)
            `);
            const res = stmt.run(cleanNumber, Math.max(0, amount));
            return res.changes > 0;
        }
        const stmt = this.db.prepare(`
            UPDATE users
            SET limit_quota = ?
            WHERE number = ?
        `);
        const res = stmt.run(Math.max(0, amount), cleanNumber);
        return res.changes > 0;
    }
}

export const appDb = new AppDatabase();
