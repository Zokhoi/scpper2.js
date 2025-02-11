import {Scpper} from "./Scpper";
import {SiteMember, WikidotPage, WikidotUser} from "./structures";
import {Api} from "./types";
import SiteResolvable from "./structures/SiteResolvable";

const branches = Object.assign({
    "scp-wiki.net": "en",
    "www.scp-wiki.net": "en",
    "scpwiki.com": "en",
    "www.scpwiki.com": "en",
    "scp-wiki.wikidot.com": "en",
    "scpfoundation.ru": "ru",
    "www.scpfoundation.ru": "ru",
    "scp-ru.wikidot.com": "ru",
    "ko.scp-wiki.net": "ko",
    "scpko.wikidot.com": "ko",
    "ja.scp-wiki.net": "ja",
    "scp-jp.wikidot.com": "ja",
    "fondationscp.wikidot.com": "fr",
    "lafundacionscp.wikidot.com": "es",
    "scp-th.wikidot.com": "th",
    "scp-wiki.net.pl": "pl",
    "scp-pl.wikidot.com": "pl",
    "scp-wiki-de.wikidot.com": "de",
    "scp-wiki-cn.wikidot.com": "cn",
    "fondazionescp.wikidot.com": "it",
    "scp-zh-tr.wikidot.com": "zh",
    'scp-vn.wikidot.com': "vn",
    "scp-int.wikidot.com": "int"
},
// Convert the enum into object
...Object.keys(Api.SiteInitial).map(key=>{ return {[key]: Api.SiteInitial[key]} }),
// Map site Wikidot names to their initials with dedupe
...[...new Set(Object.values(Api.SiteInitial))].map(key=>{ return {[Api.SiteWikidotName[key]]: key} })
);

export class SCPDataResolver {
    public readonly client: Scpper;

    /**
     * @param {Scpper} client The client the resolver is for
     */
    constructor(client: Scpper) {
        this.client = client;
    }

    /**
     * Data that resolves to give a WikidotUser object. This can be:
     * * A WikidotUser object
     * * A wikidot ID
     * * A SiteMember object
     * * A WikidotPage object (resolves to the page creator)
     * @typedef {WikidotUser| string |SiteMember|WikidotPage} WikidotUserResolvable
     */

    /**
     * Resolves a WikidotUserResolvable to a User object.
     * @param {WikidotUser | string | SiteMember | WikidotPage} user The WikidotUserResolvable to identify, currently WikidotPage is not supported
     * @returns {?WikidotUser}
     */
    public async resolveUser(user: WikidotUser | string | SiteMember | WikidotPage): Promise<WikidotUser | undefined> {
        switch (user.constructor) {
            case WikidotUser:
                return user as WikidotUser;
            case String:
                return await this.client.getUser(user as string) || undefined;
            case WikidotPage:
                let wp = user as WikidotPage;
                if (wp.authors.size) return wp.authors.values().next().value;
                else if (wp.translators.size) return wp.translators.values().next().value;
            default:
                return undefined;
        }
    }

    /**
     * Resolves a WikidotUserResolvable to a user ID string.
     * @param {WikidotUser | string | SiteMember | WikidotPage} user The WikidotUserResolvable to identify
     * @returns {?string}
     */
    public resolveUserID(user: WikidotUser | string | SiteMember | WikidotPage): string | undefined {
        switch (user.constructor) {
            case WikidotUser || SiteMember:
                return (user as WikidotUser).id.toString();
            case String:
                return user as string || undefined;
            case WikidotPage:
                let wp = user as WikidotPage;
                if (wp.authors.size) return wp.authors.values().next().value.id.toString();
                else if (wp.translators.size) return wp.translators.values().next().value.id.toString();
            default:
                return undefined;
        }
    }

    /**
     * Data that resolves to give a Site object. This can be:
     * * A SiteMember object
     * * A WikidotPage object
     * * A site inital
     * @typedef {SiteMember|WikidotPage|Api.site} SiteResolvable
     */

    private isSiteResolvable(obj: any): obj is SiteResolvable {
        return (obj as SiteResolvable).site !== "undefined";
    }

    /**
     * Resolves a SiteResolvable to a Site object.
     * @param {SiteResolvable} site The SiteResolvable to identify
     * @returns {?string}
     */
    public resolveSite(site: Api.SiteInitial | string | SiteResolvable): string | undefined {
        if (this.isSiteResolvable(site)) return site.site;

        switch (site.constructor) {
            case String:
                let s = site as string;
                if (s.includes("://")) s=s.split("://")[1];
                if (branches.hasOwnProperty(s)) return branches[s];
            default:
                return undefined;
        }
    }

    /**
     * Data that resolves to give a SiteMember object. This can be:
     * * A SiteMember object
     * * A WikidotUser object
     * @typedef {SiteMember|WikidotUser} SiteMemberResolvable
     */

    /**
     * Resolves a SiteMemberResolvable to a SiteMember object.
     * @param {SiteResolvable} site The Site that the member is part of
     * @param {WikidotUser | string | SiteMember | WikidotPage} user The user that is part of the Site
     * @returns {?SiteMember}
     */
    public async resolveSiteMember(site: SiteMember | WikidotPage | Api.SiteInitial, user: WikidotUser | string | SiteMember): Promise<SiteMember | undefined> {
        if (user instanceof SiteMember) return user;
        let s = this.resolveSite(site);
        let u = await this.resolveUser(user);
        if (!site || !user) return undefined;
        return await u.client.getSiteMember(u.id.toString(), {site: Api.SiteInitial[s]}) || undefined;
    }
}

export default SCPDataResolver;