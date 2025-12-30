import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ScrapeMetadata } from './types/scrape.interface';

/**
 * Author information - can be specified in different formats
 */
export interface ScrapeAuthor {
    /** Display name */
    name: string;
    /** Avatar URL (resolved from GitHub, Gravatar, or direct URL) */
    avatar?: string;
    /** Profile URL (GitHub profile, website, etc.) */
    url?: string;
    /** Email address */
    email?: string;
    /** Original author string from config */
    raw: string;
}

/** Resolved metadata with full author information */
export interface ScrapeMetadataResolved extends Omit<ScrapeMetadata, 'author'> {
    author?: ScrapeAuthor;
}

/**
 * Service to resolve author information from different formats:
 * - gh:@username - GitHub user
 * - email@example.com - Email (Gravatar)
 * - https://... - Direct avatar URL
 * - Name - Just a name string
 */
@Injectable()
export class AuthorResolverService {
    private readonly logger = new Logger(AuthorResolverService.name);
    private readonly cache = new Map<string, ScrapeAuthor>();
    private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

    /**
     * Resolves author string to full author information
     */
    async resolveAuthor(authorString: string, email?: string): Promise<ScrapeAuthor> {
        if (!authorString) {
            return { name: 'Unknown', raw: '' };
        }

        // Check cache
        const cacheKey = `${authorString}:${email || ''}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        let author: ScrapeAuthor;

        // GitHub user: gh:@username or gh:username
        if (authorString.startsWith('gh:')) {
            author = await this.resolveGitHubUser(authorString);
        }
        // Direct URL
        else if (authorString.startsWith('http://') || authorString.startsWith('https://')) {
            author = {
                name: 'Unknown',
                avatar: authorString,
                raw: authorString
            };
        }
        // Email address
        else if (this.isEmail(authorString)) {
            author = this.resolveGravatar(authorString);
        }
        // Just a name, possibly with email from metadata
        else {
            author = {
                name: authorString,
                raw: authorString
            };
            
            // If email provided separately, use Gravatar
            if (email && this.isEmail(email)) {
                author.avatar = this.getGravatarUrl(email);
                author.email = email;
            }
        }

        // Cache the result
        this.cache.set(cacheKey, author);
        setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL);

        return author;
    }

    /**
     * Resolves GitHub user information
     */
    private async resolveGitHubUser(authorString: string): Promise<ScrapeAuthor> {
        // Extract username: gh:@username or gh:username
        const username = authorString.replace(/^gh:@?/, '');
        
        try {
            const response = await fetch(`https://api.github.com/users/${username}`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Scrape-Dojo'
                }
            });

            if (!response.ok) {
                this.logger.warn(`⚠️ GitHub user not found: ${username}`);
                return {
                    name: username,
                    raw: authorString
                };
            }

            const data = await response.json();
            
            return {
                name: data.name || data.login,
                avatar: data.avatar_url,
                url: data.html_url,
                email: data.email || undefined,
                raw: authorString
            };
        } catch (error) {
            this.logger.error(`❌ Failed to fetch GitHub user: ${username}`, error);
            return {
                name: username,
                raw: authorString
            };
        }
    }

    /**
     * Resolves Gravatar avatar from email
     */
    private resolveGravatar(email: string): ScrapeAuthor {
        const name = email.split('@')[0];
        return {
            name: name,
            avatar: this.getGravatarUrl(email),
            email: email,
            raw: email
        };
    }

    /**
     * Generates Gravatar URL from email
     */
    private getGravatarUrl(email: string, size = 80): string {
        const hash = createHash('md5')
            .update(email.toLowerCase().trim())
            .digest('hex');
        return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
    }

    /**
     * Checks if string is an email address
     */
    private isEmail(str: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }

    /**
     * Resolves metadata with full author information
     */
    async resolveMetadata(metadata?: ScrapeMetadata): Promise<ScrapeMetadataResolved | undefined> {
        if (!metadata) {
            return undefined;
        }

        const resolved: ScrapeMetadataResolved = {
            ...metadata,
            author: undefined
        };

        if (metadata.author) {
            resolved.author = await this.resolveAuthor(metadata.author, metadata.email);
        }

        return resolved;
    }
}
