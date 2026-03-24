/// <reference types="minigame-api-typings" />

export interface IWxAdConfig {
    rewardedVideoId?: string;
    interstitialId?: string;
    bannerId?: string;
}

export interface IRewardedVideoResult {
    shown: boolean;
    completed: boolean;
    reason?: string;
}

export class wxAdManager {
    private static _instance: wxAdManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new wxAdManager();
        }
        return this._instance as wxAdManager;
    }

    private _config: IWxAdConfig = {};
    private _rewardedVideoAd: WechatMinigame.RewardedVideoAd = null;
    private _interstitialAd: WechatMinigame.InterstitialAd = null;
    private _bannerAd: WechatMinigame.BannerAd = null;

    private constructor() { }

    init(config: IWxAdConfig) {
        this._config = config || {};
    }

    isSupported() {
        return typeof wx !== "undefined";
    }

    async showRewardedVideo(): Promise<IRewardedVideoResult> {
        if (!this.isSupported()) {
            // 未运行在微信环境时，放行道具流程，方便开发阶段验证逻辑
            return { shown: false, completed: true, reason: "wx_unavailable_passthrough" };
        }
        if (!this._config.rewardedVideoId) {
            // 未配置广告位时，放行道具流程，后续接入 adUnitId 即自动切换为真实广告
            return { shown: false, completed: true, reason: "rewarded_adunit_missing_passthrough" };
        }
        if (!wx.createRewardedVideoAd) {
            return { shown: false, completed: false, reason: "rewarded_api_unavailable" };
        }

        if (this._rewardedVideoAd == null) {
            this._rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: this._config.rewardedVideoId });
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
                this._rewardedVideoAd.offClose(onClose);
                this._rewardedVideoAd.offError(onError);
            };

            this._rewardedVideoAd.onClose(onClose);
            this._rewardedVideoAd.onError(onError);

            this._rewardedVideoAd.show().catch(() => {
                this._rewardedVideoAd.load().then(() => {
                    return this._rewardedVideoAd.show();
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
        if (!this.isSupported() || !this._config.interstitialId || !wx.createInterstitialAd) {
            return false;
        }

        if (this._interstitialAd == null) {
            this._interstitialAd = wx.createInterstitialAd({ adUnitId: this._config.interstitialId });
        }

        try {
            await this._interstitialAd.show();
            return true;
        } catch (error) {
            try {
                await this._interstitialAd.load();
                await this._interstitialAd.show();
                return true;
            } catch (_error) {
                return false;
            }
        }
    }

    showBanner(style?: Partial<WechatMinigame.BannerAdStyle>) {
        if (!this.isSupported() || !this._config.bannerId || !wx.createBannerAd) {
            return;
        }

        if (this._bannerAd == null) {
            this._bannerAd = wx.createBannerAd({
                adUnitId: this._config.bannerId,
                style: Object.assign({ left: 0, top: 0, width: 320, height: 104 }, style || {})
            });
        }

        this._bannerAd.show().catch(() => { });
    }

    hideBanner() {
        if (this._bannerAd) {
            this._bannerAd.hide();
        }
    }

    destroyAll() {
        if (this._rewardedVideoAd) {
            this._rewardedVideoAd.destroy();
            this._rewardedVideoAd = null;
        }
        if (this._interstitialAd) {
            this._interstitialAd.destroy();
            this._interstitialAd = null;
        }
        if (this._bannerAd) {
            this._bannerAd.destroy();
            this._bannerAd = null;
        }
    }
}
