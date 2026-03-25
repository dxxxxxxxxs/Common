/// <reference types="minigame-api-typings" />

import Singleton from "../Singleton";

export interface IWxAdConfig {
    /**激励视频广告位id列表 */
    rewardedVideoIds?: string[];
    /**插屏广告位id列表 */
    interstitialIds?: string[];
    /**Banner广告位id列表 */
    bannerIds?: string[];
}

export interface IRewardedVideoResult {
    shown: boolean;
    completed: boolean;
    reason?: string;
}

export class wxAdManager extends Singleton {
    // private static _instance: wxAdManager;
    // public static get Instance() {
    //     if (this._instance == null) {
    //         this._instance = new wxAdManager();
    //     }
    //     return this._instance as wxAdManager;
    // }
    //private constructor() { }

    private _config: IWxAdConfig = {};
    private _rewardedVideoAdMap: Map<string, WechatMinigame.RewardedVideoAd> = new Map<string, WechatMinigame.RewardedVideoAd>();
    private _interstitialAdMap: Map<string, WechatMinigame.InterstitialAd> = new Map<string, WechatMinigame.InterstitialAd>();
    private _bannerAdMap: Map<string, WechatMinigame.BannerAd> = new Map<string, WechatMinigame.BannerAd>();
    private _activeBannerId: string = "";


    init(config: IWxAdConfig) {
        this._config = config || {};
    }

    isSupported() {
        return typeof wx !== "undefined";
    }

    private getRandomAdUnitId(ids: string[]): string {
        if (!ids || ids.length <= 0) {
            return "";
        }
        const validIds = ids.filter(id => !!id && id.trim().length > 0);
        if (validIds.length <= 0) {
            return "";
        }
        const idx = Math.floor(Math.random() * validIds.length);
        return validIds[idx];
    }

    async showRewardedVideo(): Promise<IRewardedVideoResult> {
        if (!this.isSupported()) {
            // 未运行在微信环境时，放行道具流程，方便开发阶段验证逻辑
            return { shown: false, completed: true, reason: "wx_unavailable_passthrough" };
        }
        const adUnitId = this.getRandomAdUnitId(this._config.rewardedVideoIds || []);
        if (!adUnitId) {
            // 未配置广告位时，放行道具流程，后续接入 adUnitId 即自动切换为真实广告
            return { shown: false, completed: true, reason: "rewarded_adunit_missing_passthrough" };
        }
        if (!wx.createRewardedVideoAd) {
            return { shown: false, completed: false, reason: "rewarded_api_unavailable" };
        }

        let rewardedVideoAd = this._rewardedVideoAdMap.get(adUnitId);
        if (rewardedVideoAd == null) {
            rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: adUnitId });
            this._rewardedVideoAdMap.set(adUnitId, rewardedVideoAd);
        }

        return new Promise<IRewardedVideoResult>((resolve) => {
            const onClose = (res: { isEnded?: boolean }) => {
                cleanup();
                const completed = res == null || res.isEnded == null ? true : !!res.isEnded;
                resolve({ shown: true, completed: completed, reason: "closed" });
            };
            const onError = (err: { errCode?: number }) => {
                cleanup();
                resolve({
                    shown: false,
                    completed: false,
                    reason: "rewarded_error_" + (err && err.errCode != null ? err.errCode : "unknown")
                });
            };
            const cleanup = () => {
                rewardedVideoAd.offClose(onClose);
                rewardedVideoAd.offError(onError);
            };

            rewardedVideoAd.onClose(onClose);
            rewardedVideoAd.onError(onError);

            rewardedVideoAd.show().catch(() => {
                rewardedVideoAd.load().then(() => {
                    return rewardedVideoAd.show();
                }).catch((err: { errCode?: number }) => {
                    cleanup();
                    resolve({
                        shown: false,
                        completed: false,
                        reason: "rewarded_show_fail_" + (err && err.errCode != null ? err.errCode : "unknown")
                    });
                });
            });
        });
    }

    async showInterstitial(): Promise<boolean> {
        if (!this.isSupported() || !wx.createInterstitialAd) {
            return false;
        }
        const adUnitId = this.getRandomAdUnitId(this._config.interstitialIds || []);
        if (!adUnitId) {
            return false;
        }

        let interstitialAd = this._interstitialAdMap.get(adUnitId);
        if (interstitialAd == null) {
            interstitialAd = wx.createInterstitialAd({ adUnitId: adUnitId });
            this._interstitialAdMap.set(adUnitId, interstitialAd);
        }

        try {
            await interstitialAd.show();
            return true;
        } catch (error) {
            try {
                await interstitialAd.load();
                await interstitialAd.show();
                return true;
            } catch (_error) {
                return false;
            }
        }
    }

    showBanner(style?: Partial<WechatMinigame.BannerAdStyle>) {
        if (!this.isSupported() || !wx.createBannerAd) {
            return;
        }
        const adUnitId = this.getRandomAdUnitId(this._config.bannerIds || []);
        if (!adUnitId) {
            return;
        }

        let bannerAd = this._bannerAdMap.get(adUnitId);
        if (bannerAd == null) {
            bannerAd = wx.createBannerAd({
                adUnitId: adUnitId,
                style: Object.assign({ left: 0, top: 0, width: 320, height: 104 }, style || {})
            });
            this._bannerAdMap.set(adUnitId, bannerAd);
        }
        this._activeBannerId = adUnitId;

        bannerAd.show().catch(() => { });
    }

    hideBanner() {
        if (this._activeBannerId && this._bannerAdMap.has(this._activeBannerId)) {
            this._bannerAdMap.get(this._activeBannerId).hide();
        }
    }

    destroyAll() {
        this._rewardedVideoAdMap.forEach(ad => ad.destroy());
        this._rewardedVideoAdMap.clear();
        this._interstitialAdMap.forEach(ad => ad.destroy());
        this._interstitialAdMap.clear();
        this._bannerAdMap.forEach(ad => ad.destroy());
        this._bannerAdMap.clear();
        this._activeBannerId = "";
    }
}
