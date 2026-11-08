import axios, { type AxiosRequestConfig } from 'axios';

export interface RobloxBasicInfo {
    id: number;
    name: string;
    displayName: string;
    description: string;
    created: string;
    isBanned: boolean;
    externalAppDisplayName?: string | null;
    hasVerifiedBadge: boolean;
}

export interface RobloxPresence {
    userPresenceType: number;
    userPresenceText: string;
    lastLocation?: string | null;
    placeId?: number | null;
    rootPlaceId?: number | null;
    gameId?: string | null;
    universeId?: number | null;
    userId: number;
    lastOnline?: string | null;
}

export interface RobloxSocial {
    friends: number;
    followers: number;
    following: number;
}

export interface RobloxGroupRole {
    group: {
        id: number;
        name: string;
        memberCount: number;
        hasVerifiedBadge: boolean;
    };
    role: {
        id: number;
        name: string;
        rank: number;
    };
}

export interface RobloxAvatarImages {
    headshot?: string | null;
    fullBody?: string | null;
    bust?: string | null;
}

export interface RobloxStalkResult {
    userId: number;
    basic: RobloxBasicInfo | null;
    status: string | null;
    presence: RobloxPresence | null;
    social: RobloxSocial;
    avatar: RobloxAvatarImages;
    groups: {
        primary?: RobloxGroupRole | null;
        total: number;
        list: RobloxGroupRole[];
    };
    profileUrl: string;
}

export class RobloxAPI {
    private readonly baseUrl = 'https://api.roblox.com';

    async request<T = any>(url: string, method: 'GET' | 'POST' = 'GET', data: any = null, timeout: number = 10000): Promise<T | null> {
        try {
            const config: AxiosRequestConfig = {
                method,
                url,
                timeout,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            };
            if (data) config.data = data;
            const response = await axios(config);
            return response.data as T;
        } catch {
            return null;
        }
    }

    async getUserIdFromUsername(username: string): Promise<number | null> {
        const cleanName = username.trim().replace(/^@+/, '');
        const data = await this.request<{ data?: Array<{ id: number; name: string }> }>(
            'https://users.roblox.com/v1/usernames/users',
            'POST',
            {
                usernames: [cleanName],
                excludeBannedUsers: false
            }
        );
        return data?.data?.[0]?.id || null;
    }

    async getUserInfo(userId: number): Promise<RobloxBasicInfo | null> {
        return await this.request<RobloxBasicInfo>(`https://users.roblox.com/v1/users/${userId}`);
    }

    async getUserStatus(userId: number): Promise<string | null> {
        const res = await this.request<{ status?: string }>(`https://users.roblox.com/v1/users/${userId}/status`);
        return res?.status || null;
    }

    async getUserPresence(userIds: number[]): Promise<RobloxPresence | null> {
        const res = await this.request<{ userPresences?: any[] }>(
            'https://presence.roblox.com/v1/presence/users',
            'POST',
            { userIds }
        );
        const p = res?.userPresences?.[0];
        if (!p) return null;

        const typeMap: Record<number, string> = {
            0: 'Offline',
            1: 'Online',
            2: 'In Game',
            3: 'In Studio'
        };

        return {
            ...p,
            userPresenceText: typeMap[p.userPresenceType] || 'Unknown'
        };
    }

    async getUserFriendsCount(userId: number): Promise<number> {
        const res = await this.request<{ count?: number }>(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
        return res?.count || 0;
    }

    async getUserFollowersCount(userId: number): Promise<number> {
        const res = await this.request<{ count?: number }>(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
        return res?.count || 0;
    }

    async getUserFollowingCount(userId: number): Promise<number> {
        const res = await this.request<{ count?: number }>(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
        return res?.count || 0;
    }

    async getUserAvatarHeadshot(userId: number, size: string = '420x420'): Promise<string | null> {
        const res = await this.request<{ data?: Array<{ imageUrl?: string }> }>(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`
        );
        return res?.data?.[0]?.imageUrl || null;
    }

    async getUserAvatarFullBody(userId: number, size: string = '720x720'): Promise<string | null> {
        const res = await this.request<{ data?: Array<{ imageUrl?: string }> }>(
            `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=${size}&format=Png&isCircular=false`
        );
        return res?.data?.[0]?.imageUrl || null;
    }

    async getUserAvatarBust(userId: number, size: string = '420x420'): Promise<string | null> {
        const res = await this.request<{ data?: Array<{ imageUrl?: string }> }>(
            `https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${userId}&size=${size}&format=Png&isCircular=false`
        );
        return res?.data?.[0]?.imageUrl || null;
    }

    async getUserGroups(userId: number): Promise<RobloxGroupRole[]> {
        const res = await this.request<{ data?: RobloxGroupRole[] }>(
            `https://groups.roblox.com/v1/users/${userId}/groups/roles`
        );
        return res?.data || [];
    }

    async getUserPrimaryGroup(userId: number): Promise<RobloxGroupRole | null> {
        return await this.request<RobloxGroupRole>(`https://groups.roblox.com/v1/users/${userId}/groups/primary/role`);
    }

    formatPresence(type: number): string {
        const presenceMap: Record<number, string> = {
            0: 'Offline',
            1: 'Online',
            2: 'In Game',
            3: 'In Studio'
        };
        return presenceMap[type] || 'Unknown';
    }

    async getCompleteUserInfo(username: string): Promise<RobloxStalkResult | null> {
        const userId = await this.getUserIdFromUsername(username);
        if (!userId) return null;

        const [
            basic,
            status,
            presence,
            friends,
            followers,
            following,
            groups,
            primaryGroup,
            headshot,
            fullBody,
            bust
        ] = await Promise.all([
            this.getUserInfo(userId),
            this.getUserStatus(userId),
            this.getUserPresence([userId]),
            this.getUserFriendsCount(userId),
            this.getUserFollowersCount(userId),
            this.getUserFollowingCount(userId),
            this.getUserGroups(userId),
            this.getUserPrimaryGroup(userId),
            this.getUserAvatarHeadshot(userId),
            this.getUserAvatarFullBody(userId),
            this.getUserAvatarBust(userId)
        ]);

        return {
            userId,
            basic,
            status,
            presence,
            social: {
                friends,
                followers,
                following
            },
            avatar: {
                headshot,
                fullBody,
                bust
            },
            groups: {
                primary: primaryGroup,
                total: groups.length,
                list: groups
            },
            profileUrl: `https://www.roblox.com/users/${userId}/profile`
        };
    }
}

export const Roblox = new RobloxAPI();

export async function stalkRoblox(username: string): Promise<RobloxStalkResult> {
    const result = await Roblox.getCompleteUserInfo(username);
    if (!result) {
        throw new Error(`Pengguna Roblox "${username}" tidak ditemukan.`);
    }
    return result;
}

export default stalkRoblox;
