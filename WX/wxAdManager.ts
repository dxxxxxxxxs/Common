/// <reference types="minigame-api-typings" />

import { IPlatformAd, IPlatformAdConfig, IRewardedVideoResult } from "../Platform/Platform";
import Singleton from "../Singleton";

export class wxAdManager extends Singleton implements IPlatformAd {
    public static get Instance(): wxAdManager {
        return this.getSingletonInstance() as wxAdManager;
    }
    // private static _instance: wxAdManager;
    // public static get Instance() {
    //     if (this._instance == null) {
    //         this._instance = new wxAdManager();
    //     }
    //     return this._instance as wxAdManager;
    // }
    //private constructor() { }

    private _config: IPlatformAdConfig = {};
    private _rewardedVideoAdMap: Map<string, WechatMinigame.RewardedVideoAd> = new Map<string, WechatMinigame.RewardedVideoAd>();
    private _rewardedVideoAvailableMap: Map<string, boolean> = new Map<string, boolean>();
    private _interstitialAdMap: Map<string, WechatMinigame.InterstitialAd> = new Map<string, WechatMinigame.InterstitialAd>();
    private _bannerAdMap: Map<string, WechatMinigame.BannerAd> = new Map<string, WechatMinigame.BannerAd>();
    private _activeBannerId: string = "";


    init(config: IPlatformAdConfig) {
        this._config = config || {};
        const rewardedIds = this._config.rewardedVideoIds || [];
        for (const adUnitId of rewardedIds) {
            this.ensureRewardedVideoAd(adUnitId);
        }
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

    private showToast(title: string) {
        if (!this.isSupported() || !wx.showToast) {
            return;
        }
        wx.showToast({
            title,
            icon: "none",
            duration: 2000,
        });
    }

    private getRewardedErrorMessage(errCode?: number): string {
        switch (errCode) {
            case 1002:
                return "广告单元无效，请稍后再试";
            case 1003:
                return "内部错误，请稍后再试";
            case 1004:
                return "暂无合适广告，请稍后再试";
            case 1005:
                return "广告组件审核中";
            case 1006:
                return "广告组件被驳回";
            case 1007:
                return "广告组件已关闭";
            case 1008:
                return "暂无广告可用，请稍后再试";
            default:
                return "广告加载失败，请稍后再试";
        }
    }

    private handleRewardedError(adUnitId: string, err?: { errCode?: number; errMsg?: string }, showUserTip: boolean = true) {
        this._rewardedVideoAvailableMap.set(adUnitId, false);
        console.warn("rewardedVideoAd error:", adUnitId, err);
        if (showUserTip) {
            this.showToast(this.getRewardedErrorMessage(err && err.errCode));
        }
    }

    private ensureRewardedVideoAd(adUnitId: string): WechatMinigame.RewardedVideoAd {
        let rewardedVideoAd = this._rewardedVideoAdMap.get(adUnitId);
        if (rewardedVideoAd != null) {
            return rewardedVideoAd;
        }

        rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: adUnitId });
        rewardedVideoAd.onLoad(() => {
            this._rewardedVideoAvailableMap.set(adUnitId, true);
        });
        rewardedVideoAd.onError((err) => {
            this.handleRewardedError(adUnitId, err, false);
        });

        this._rewardedVideoAdMap.set(adUnitId, rewardedVideoAd);
        this._rewardedVideoAvailableMap.set(adUnitId, true);
        rewardedVideoAd.load().catch((err) => {
            this.handleRewardedError(adUnitId, err, false);
        });
        return rewardedVideoAd;
    }

    isRewardedVideoAvailable(): boolean {
        if (!this.isSupported() || !wx.createRewardedVideoAd) {
            return false;
        }

        const rewardedIds = (this._config.rewardedVideoIds || []).filter(id => !!id && id.trim().length > 0);
        if (rewardedIds.length <= 0) {
            return false;
        }

        let hasAvailableAd = false;
        for (const adUnitId of rewardedIds) {
            const rewardedVideoAd = this.ensureRewardedVideoAd(adUnitId);
            const isAvailable = this._rewardedVideoAvailableMap.get(adUnitId) !== false;
            if (isAvailable) {
                hasAvailableAd = true;
                break;
            }

            rewardedVideoAd.load().then(() => {
                this._rewardedVideoAvailableMap.set(adUnitId, true);
            }).catch((err) => {
                this.handleRewardedError(adUnitId, err, false);
            });
        }
        return hasAvailableAd;
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

        const rewardedVideoAd = this.ensureRewardedVideoAd(adUnitId);
        if (!this.isRewardedVideoAvailable() || this._rewardedVideoAvailableMap.get(adUnitId) === false) {
            this.showToast("暂无合适广告，请稍后再试");
            return { shown: false, completed: false, reason: "rewarded_no_fill" };
        }

        return new Promise<IRewardedVideoResult>((resolve) => {
            const onClose = (res: { isEnded?: boolean }) => {
                cleanup();
                const completed = res == null || res.isEnded == null ? true : !!res.isEnded;
                resolve({ shown: true, completed: completed, reason: "closed" });
            };
            const onError = (err: { errCode?: number }) => {
                cleanup();
                this.handleRewardedError(adUnitId, err);
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
                    this._rewardedVideoAvailableMap.set(adUnitId, true);
                    return rewardedVideoAd.show();
                }).catch((err: { errCode?: number }) => {
                    cleanup();
                    this.handleRewardedError(adUnitId, err);
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
        this._rewardedVideoAvailableMap.clear();
        this._interstitialAdMap.forEach(ad => ad.destroy());
        this._interstitialAdMap.clear();
        this._bannerAdMap.forEach(ad => ad.destroy());
        this._bannerAdMap.clear();
        this._activeBannerId = "";
    }
}
