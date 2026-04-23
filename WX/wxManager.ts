/// <reference types="minigame-api-typings" />
import I18nManager from "../I18n/I18nManager";
import { IPlatform, ShareConfig, ShareConfigProvider } from "../Platform/Platform";
import Singleton from "../Singleton";
import { wxAdManager } from "./wxAdManager";
export class wxManager extends Singleton implements IPlatform {
    public static get Instance(): wxManager {
        return this.getSingletonInstance() as wxManager;
    }

    private _shareImageUrl: string = "";
    private _shareTimelineTitle: string = "";
    private _shareConfigProvider: ShareConfigProvider = null;
    private _onShowCallbacks: Array<(query: Record<string, string>) => void> = [];

    private get hasWx() {
        return typeof wx !== "undefined";
    }

    public get isWxPlatform() {
        return this.hasWx;
    }

    public get name() {
        return "wx";
    }

    public get supportsRank() {
        return this.hasWx;
    }

    public get supportsShare() {
        return this.hasWx;
    }

    onShow() {
        if (!this.hasWx) return;
        wx.onShow((res: any) => {
            const query = this.parseQuery(res?.query);
            // 切回前台时，顺便让广告管理器给可能过期的激励视频素材发一次 reload，
            // 避免玩家切回来立刻点按钮又要等 load。
            try { this.Ad.onGameShow(); } catch (e) { console.warn("Ad.onGameShow error", e); }
            for (const cb of this._onShowCallbacks) {
                try { cb(query); } catch (e) { console.error("onShow callback error", e); }
            }
        });
    }

    onHide() {
        if (!this.hasWx) return;
        wx.onHide((_res: any) => { });
    }

    getWindowInfo() {
        if (!this.hasWx) return null;
        return wx.getWindowInfo();
    }

    addOnShowListener(callback: (query: Record<string, string>) => void) {
        if (callback) {
            this._onShowCallbacks.push(callback);
        }
    }

    setShareProvider(provider: ShareConfigProvider) {
        this._shareConfigProvider = provider;
    }

    initShare(title: string, imageUrl: string, timelineTitle?: string) {
        this._shareImageUrl = imageUrl;
        this._shareTimelineTitle = timelineTitle || title;
        this.showShareMenu();
        this.setupPassiveShareCallbacks();
    }

    private showShareMenu() {
        if (!this.hasWx) return;
        wx.showShareMenu({
            menus: ['shareAppMessage', 'shareTimeline']
        });
    }

    private setupPassiveShareCallbacks() {
        if (!this.hasWx) return;

        wx.onShareAppMessage(() => {
            const config = this._shareConfigProvider ? this._shareConfigProvider() : null;
            return {
                title: config?.title || this._shareTimelineTitle,
                imageUrl: config?.imageUrl || this._shareImageUrl,
                query: config?.query || "",
            };
        });

        wx.onShareTimeline(() => ({
            title: this._shareTimelineTitle,
            imageUrl: this._shareImageUrl,
        }));
    }

    async shareAppMessage(title?: string, imageUrl?: string, query?: string): Promise<boolean> {
        if (!this.hasWx) {
            return true;
        }
        if (!wx.shareAppMessage) {
            return false;
        }

        return new Promise<boolean>((resolve) => {
            try {
                const config = this._shareConfigProvider ? this._shareConfigProvider() : null;
                const shareOptions: any = {
                    title: title || config?.title || this._shareTimelineTitle,
                    imageUrl: imageUrl || config?.imageUrl || this._shareImageUrl,
                    query: query || config?.query || "",
                    success: () => resolve(true),
                    fail: () => resolve(false),
                };
                wx.shareAppMessage(shareOptions);
            } catch (error) {
                console.error("shareAppMessage failed", error);
                resolve(false);
            }
        });
    }

    private parseQuery(queryStr?: string): Record<string, string> {
        const result: Record<string, string> = {};
        if (!queryStr) return result;
        const pairs = queryStr.split("&");
        for (const pair of pairs) {
            const idx = pair.indexOf("=");
            if (idx > 0) {
                const key = decodeURIComponent(pair.substring(0, idx));
                const value = decodeURIComponent(pair.substring(idx + 1));
                result[key] = value;
            }
        }
        return result;
    }

    /** WX广告 */
    public get Ad() {
        return wxAdManager.Instance;
    }

    /**上报最高关卡到微信云存储（用于好友排行榜） */
    postMaxLevel(level: number) {
        if (!this.hasWx) return;
        wx.setUserCloudStorage({
            KVDataList: [{
                key: "maxLevel",
                value: JSON.stringify({
                    wxgame: { score: level, update_time: Date.now() }
                })
            }],
            success: () => console.log("上报最高关卡成功:", level),
            fail: (err: any) => console.error("上报最高关卡失败:", err)
        });
    }

    /**通知开放数据域显示排行榜 */
    showRank() {
        if (!this.hasWx) return;
        const ctx = wx.getOpenDataContext();
        ctx.postMessage({
            type: "showRank",
            emptyRankText: I18nManager.Instance.t("common.emptyRank", "暂无排行数据"),
            defaultNickname: I18nManager.Instance.t("common.wxUser", "微信用户"),
        });
    }

    /**通知开放数据域隐藏排行榜 */
    hideRank() {
        if (!this.hasWx) return;
        const ctx = wx.getOpenDataContext();
        ctx.postMessage({ type: "hideRank" });
    }

    openGameClub(path: string) {
        if (!this.hasWx) return;
        const pageManager = (wx as any).createPageManager();

        pageManager.load({
            openlink: path, // 由不同渠道获得的OPENLINK值
        }).then((res) => {
            // 加载成功，res 可能携带不同活动、功能返回的特殊回包信息（具体请参阅渠道说明）
            console.log(res);

            // 加载成功后按需显示
            pageManager.show();

        }).catch((err) => {
            // 加载失败，请查阅 err 给出的错误信息
            console.error(err);
        })

    }
}