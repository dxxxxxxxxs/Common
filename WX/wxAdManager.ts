/// <reference types="minigame-api-typings" />

import { IPlatformAd, IPlatformAdConfig, IRewardedVideoResult } from "../Platform/Platform";
import Singleton from "../Singleton";

/**
 * 激励视频就绪事件的等待者（一次性回调）
 * - 当 UI 触发 showRewardedVideo 时，如果此广告位尚未 onLoad，
 *   会注册一个 waiter 挂着等待，load 完成或超时后统一通知，避免轮询。
 */
interface ILoadWaiter {
    resolve: (ok: boolean) => void;
    timer: any;
}

/**
 * 微信小游戏广告管理
 *
 * 关键设计：
 *  1. "available" 状态只由 onLoad 置 true，避免创建后立刻误判为可用，
 *     导致"点按钮 → show 卡 N 秒等 load"的糟糕体验。
 *  2. onClose / onError 回调里会按需立即 reload，保证下一次触发秒开。
 *  3. showRewardedVideo 在未就绪时，会用 wx.showLoading 做遮罩并等待最多
 *     WAIT_READY_TIMEOUT_MS 毫秒，避免用户"按钮无反应"的错觉；
 *     超时则 toast 提示，放行 UI 恢复可点击。
 *  4. onGameShow 用于小游戏切回前台时做一次补 load。
 */
export class wxAdManager extends Singleton implements IPlatformAd {
    public static get Instance(): wxAdManager {
        return this.getSingletonInstance() as wxAdManager;
    }

    private _config: IPlatformAdConfig = {};

    // 已创建的激励视频广告实例
    private _rewardedVideoAdMap: Map<string, WechatMinigame.RewardedVideoAd> = new Map<string, WechatMinigame.RewardedVideoAd>();
    // 该广告位的素材是否已 onLoad 就绪（true = 可立即 show）
    private _rewardedVideoAvailableMap: Map<string, boolean> = new Map<string, boolean>();
    // 该广告位是否正在 load 中，避免同一时刻发起多次重复 load
    private _rewardedVideoLoadingMap: Map<string, boolean> = new Map<string, boolean>();
    // 等待某个广告位就绪的回调队列（供 show 前的等待逻辑使用）
    private _rewardedVideoWaitersMap: Map<string, ILoadWaiter[]> = new Map<string, ILoadWaiter[]>();
    // 最近一次错误码，用于超时 toast 时把具体原因透出给玩家
    private _rewardedVideoLastErrMap: Map<string, number> = new Map<string, number>();
    // 正在展示中的激励视频回调（按 adUnitId 存一条，避免重复绑定 onClose/onError）
    private _rewardedVideoShowPendingMap: Map<string, (result: IRewardedVideoResult) => void> = new Map<string, (result: IRewardedVideoResult) => void>();
    // 事件函数引用缓存：用于 offXxx 精准解绑，避免同一广告实例重复绑定
    private _rewardedVideoOnLoadHandlerMap: Map<string, () => void> = new Map<string, () => void>();
    private _rewardedVideoOnErrorHandlerMap: Map<string, (err: any) => void> = new Map<string, (err: any) => void>();
    private _rewardedVideoOnCloseHandlerMap: Map<string, (res: any) => void> = new Map<string, (res: any) => void>();

    private _interstitialAdMap: Map<string, WechatMinigame.InterstitialAd> = new Map<string, WechatMinigame.InterstitialAd>();
    private _bannerAdMap: Map<string, WechatMinigame.BannerAd> = new Map<string, WechatMinigame.BannerAd>();
    private _activeBannerId: string = "";

    // show 前等待广告就绪的最大时长（毫秒）
    private static readonly WAIT_READY_TIMEOUT_MS = 4000;
    // 非致命错误后延迟多久再自动重试 load（毫秒），避免错误瞬间疯狂重试
    private static readonly RELOAD_BACKOFF_MS = 3000;


    init(config: IPlatformAdConfig) {
        this._config = config || {};
        const rewardedIds = this.getValidRewardedIds();
        for (const adUnitId of rewardedIds) {
            this.ensureRewardedVideoAd(adUnitId);
        }
    }

    isSupported() {
        return typeof wx !== "undefined";
    }

    /**
     * 主动预加载：推荐在进入"可能触发广告"的页面时调用一次，
     * 比如 UIGame/UIGameOver/UIDailyFlower 的 onLoad 里，
     * 让素材在用户点按钮之前就拉好。
     */
    preloadRewardedVideo(): void {
        if (!this.isSupported() || !wx.createRewardedVideoAd) return;
        const rewardedIds = this.getValidRewardedIds();
        for (const adUnitId of rewardedIds) {
            this.ensureRewardedVideoAd(adUnitId);
            if (this._rewardedVideoAvailableMap.get(adUnitId) !== true) {
                this.loadRewardedVideo(adUnitId);
            }
        }
    }

    /**
     * 切回前台时调用：广告素材可能已经因超时被服务端清空，
     * 这里对未就绪的广告位都发一次 load，保证玩家切回游戏就能立即看广告。
     */
    onGameShow(): void {
        if (!this.isSupported() || !wx.createRewardedVideoAd) return;
        this._rewardedVideoAdMap.forEach((_ad, adUnitId) => {
            if (this._rewardedVideoAvailableMap.get(adUnitId) !== true) {
                this.loadRewardedVideo(adUnitId);
            }
        });
    }

    private getValidRewardedIds(): string[] {
        return (this._config.rewardedVideoIds || []).filter(id => !!id && id.trim().length > 0);
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

    /**
     * 挑一个激励视频广告位：优先从"已就绪"里随机选，没有就绪的再从所有里随机选。
     * 这样当多个 adUnitId 并存时，总能挑到最快可 show 的那个。
     */
    private pickRewardedAdUnitId(): string {
        const ids = this.getValidRewardedIds();
        if (ids.length <= 0) return "";

        const readyIds = ids.filter(id => this._rewardedVideoAvailableMap.get(id) === true);
        if (readyIds.length > 0) {
            return readyIds[Math.floor(Math.random() * readyIds.length)];
        }
        return ids[Math.floor(Math.random() * ids.length)];
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

    /** 仅在等待广告就绪期间使用的遮罩，让玩家知道"没卡死，是在拉广告" */
    private showLoading(title: string) {
        if (!this.isSupported() || !(wx as any).showLoading) return;
        try {
            (wx as any).showLoading({ title, mask: true });
        } catch (_e) { /* ignore */ }
    }

    private hideLoading() {
        if (!this.isSupported() || !(wx as any).hideLoading) return;
        try {
            (wx as any).hideLoading();
        } catch (_e) { /* ignore */ }
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

    /**
     * 创建（或取回）一个 RewardedVideoAd 实例，并注册全量事件监听。
     * 注意：onLoad/onError/onClose 都会在这里注册一次，这些事件是"全局"级别的，
     *      每次 load 结束都会触发，不需要每次 show 重新注册。
     */
    private ensureRewardedVideoAd(adUnitId: string): WechatMinigame.RewardedVideoAd {
        let rewardedVideoAd = this._rewardedVideoAdMap.get(adUnitId);
        let isNewAd = false;
        if (rewardedVideoAd == null) {
            rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: adUnitId });
            this._rewardedVideoAdMap.set(adUnitId, rewardedVideoAd);
            this._rewardedVideoAvailableMap.set(adUnitId, false);
            this._rewardedVideoLoadingMap.set(adUnitId, false);
            isNewAd = true;
        }

        const onLoad = this._rewardedVideoOnLoadHandlerMap.get(adUnitId) || (() => {
            this._rewardedVideoAvailableMap.set(adUnitId, true);
            this._rewardedVideoLoadingMap.set(adUnitId, false);
            this._rewardedVideoLastErrMap.delete(adUnitId);
            this.notifyWaiters(adUnitId, true);
        });
        this._rewardedVideoOnLoadHandlerMap.set(adUnitId, onLoad);

        const onError = this._rewardedVideoOnErrorHandlerMap.get(adUnitId) || ((err: any) => {
            const errCode: number | undefined = err && err.errCode;
            console.warn("rewardedVideoAd error:", adUnitId, err);
            this._rewardedVideoAvailableMap.set(adUnitId, false);
            this._rewardedVideoLoadingMap.set(adUnitId, false);
            this._rewardedVideoLastErrMap.set(adUnitId, errCode != null ? errCode : -1);
            this.notifyWaiters(adUnitId, false);
            const pendingShowResolve = this._rewardedVideoShowPendingMap.get(adUnitId);
            if (pendingShowResolve) {
                this._rewardedVideoShowPendingMap.delete(adUnitId);
                // 只有本次是玩家主动触发 show 时才提示，避免后台 preload 失败频繁打扰
                this.showToast(this.getRewardedErrorMessage(errCode));
                pendingShowResolve({
                    shown: false,
                    completed: false,
                    reason: "rewarded_error_" + (errCode != null ? errCode : "unknown")
                });
            }

            // 1006/1007 是永久性配置/审核问题，再怎么重试也是错，直接放弃
            if (errCode !== 1006 && errCode !== 1007) {
                setTimeout(() => {
                    if (this._rewardedVideoAvailableMap.get(adUnitId) !== true
                        && this._rewardedVideoLoadingMap.get(adUnitId) !== true) {
                        this.loadRewardedVideo(adUnitId);
                    }
                }, wxAdManager.RELOAD_BACKOFF_MS);
            }
        });
        this._rewardedVideoOnErrorHandlerMap.set(adUnitId, onError);

        const onClose = this._rewardedVideoOnCloseHandlerMap.get(adUnitId) || ((res: any) => {
            // 广告关闭的瞬间立刻预加载下一支，下次 show 就是秒开
            this._rewardedVideoAvailableMap.set(adUnitId, false);
            const pendingShowResolve = this._rewardedVideoShowPendingMap.get(adUnitId);
            if (pendingShowResolve) {
                this._rewardedVideoShowPendingMap.delete(adUnitId);
                const completed = res == null || res.isEnded == null ? true : !!res.isEnded;
                pendingShowResolve({ shown: true, completed: completed, reason: "closed" });
            }
            this.loadRewardedVideo(adUnitId);
        });
        this._rewardedVideoOnCloseHandlerMap.set(adUnitId, onClose);

        // 先解绑再绑定，确保同一 ad 实例在任何重复初始化路径下都只有一份监听
        rewardedVideoAd.offLoad(onLoad);
        rewardedVideoAd.offError(onError);
        rewardedVideoAd.offClose(onClose);
        rewardedVideoAd.onLoad(onLoad);
        rewardedVideoAd.onError(onError);
        rewardedVideoAd.onClose(onClose);

        // 仅首次创建时触发首轮 load；后续重复 ensure 不再强制 load，避免无意义请求
        if (isNewAd) {
            this.loadRewardedVideo(adUnitId);
        }
        return rewardedVideoAd;
    }

    /**
     * 对指定广告位发起一次 load；如果已在 load 中则直接忽略，避免重复请求。
     * 本方法不会抛异常，所有错误都会通过 onError 回调进入统一处理流程。
     */
    private loadRewardedVideo(adUnitId: string): void {
        const ad = this._rewardedVideoAdMap.get(adUnitId);
        if (!ad) return;
        if (this._rewardedVideoLoadingMap.get(adUnitId) === true) return;

        this._rewardedVideoLoadingMap.set(adUnitId, true);
        ad.load().then(() => {
            // onLoad 事件会处理可用状态和 waiters；这里兜底一次，避免极端情况下 onLoad 未触发
            this._rewardedVideoAvailableMap.set(adUnitId, true);
            this._rewardedVideoLoadingMap.set(adUnitId, false);
            this.notifyWaiters(adUnitId, true);
        }).catch((err: any) => {
            // 错误由 onError 负责置状态 + 延迟重试，这里只标记 loading 结束避免死锁
            this._rewardedVideoLoadingMap.set(adUnitId, false);
            this._rewardedVideoLastErrMap.set(adUnitId, (err && err.errCode != null) ? err.errCode : -1);
            this.notifyWaiters(adUnitId, false);
        });
    }

    /** 通知所有在等这个广告位就绪的调用方 */
    private notifyWaiters(adUnitId: string, ok: boolean) {
        const list = this._rewardedVideoWaitersMap.get(adUnitId);
        if (!list || list.length <= 0) return;
        this._rewardedVideoWaitersMap.set(adUnitId, []);
        for (const w of list) {
            if (w.timer) clearTimeout(w.timer);
            try { w.resolve(ok); } catch (_e) { /* ignore */ }
        }
    }

    /**
     * 等待某个广告位在 timeoutMs 内变 available；超时返回 false。
     * 若调用时还未在 load 中，会自动补一次 load。
     */
    private waitForRewardedReady(adUnitId: string, timeoutMs: number): Promise<boolean> {
        if (this._rewardedVideoAvailableMap.get(adUnitId) === true) {
            return Promise.resolve(true);
        }
        if (this._rewardedVideoLoadingMap.get(adUnitId) !== true) {
            this.loadRewardedVideo(adUnitId);
        }

        return new Promise<boolean>((resolve) => {
            const waiter: ILoadWaiter = {
                resolve,
                timer: null,
            };
            waiter.timer = setTimeout(() => {
                const list = this._rewardedVideoWaitersMap.get(adUnitId) || [];
                this._rewardedVideoWaitersMap.set(adUnitId, list.filter(w => w !== waiter));
                resolve(false);
            }, Math.max(500, timeoutMs));

            const list = this._rewardedVideoWaitersMap.get(adUnitId) || [];
            list.push(waiter);
            this._rewardedVideoWaitersMap.set(adUnitId, list);
        });
    }

    /**
     * 激励视频是否"可展示"（UI 层用来决定要不要把广告按钮显示为可点）。
     * 只做查询，不再在这里触发强制 reload（以免刷新按钮状态时频繁发网络请求）。
     * 真正的"兜底 load"交给 ensureRewardedVideoAd 首次创建 + onClose + onError backoff + onGameShow 组合承担。
     */
    isRewardedVideoAvailable(): boolean {
        if (!this.isSupported() || !wx.createRewardedVideoAd) {
            return false;
        }

        const rewardedIds = this.getValidRewardedIds();
        if (rewardedIds.length <= 0) {
            return false;
        }

        // 确保所有广告位实例都已创建（第一次调用时会触发 load）
        for (const adUnitId of rewardedIds) {
            this.ensureRewardedVideoAd(adUnitId);
        }

        for (const adUnitId of rewardedIds) {
            if (this._rewardedVideoAvailableMap.get(adUnitId) === true) {
                return true;
            }
        }
        return false;
    }

    async showRewardedVideo(): Promise<IRewardedVideoResult> {
        if (!this.isSupported()) {
            // 未运行在微信环境时，放行道具流程，方便开发阶段验证逻辑
            return { shown: false, completed: true, reason: "wx_unavailable_passthrough" };
        }
        const rewardedIds = this.getValidRewardedIds();
        if (rewardedIds.length <= 0) {
            // 未配置广告位时，放行道具流程，后续接入 adUnitId 即自动切换为真实广告
            return { shown: false, completed: true, reason: "rewarded_adunit_missing_passthrough" };
        }
        if (!wx.createRewardedVideoAd) {
            return { shown: false, completed: false, reason: "rewarded_api_unavailable" };
        }

        // 优先选已就绪的广告位，避免明明另一个就绪了还在等这个加载
        const adUnitId = this.pickRewardedAdUnitId();
        const rewardedVideoAd = this.ensureRewardedVideoAd(adUnitId);

        // 没就绪：挂 loading 等一会，避免"点按钮没反应"的体感
        if (this._rewardedVideoAvailableMap.get(adUnitId) !== true) {
            this.showLoading("广告加载中…");
            const ready = await this.waitForRewardedReady(adUnitId, wxAdManager.WAIT_READY_TIMEOUT_MS);
            this.hideLoading();

            if (!ready) {
                const errCode = this._rewardedVideoLastErrMap.get(adUnitId);
                this.showToast(this.getRewardedErrorMessage(errCode));
                return { shown: false, completed: false, reason: "rewarded_not_ready" };
            }
        }

        return new Promise<IRewardedVideoResult>((resolve) => {
            // 理论上同一 adUnit 不应并发 show；若发生并发，先结束旧请求，避免悬空 Promise。
            const prevPending = this._rewardedVideoShowPendingMap.get(adUnitId);
            if (prevPending) {
                prevPending({ shown: false, completed: false, reason: "rewarded_replaced_by_new_show" });
                this._rewardedVideoShowPendingMap.delete(adUnitId);
            }
            this._rewardedVideoShowPendingMap.set(adUnitId, resolve);

            rewardedVideoAd.show().catch((showErr: { errCode?: number }) => {
                // show 失败兜底：重新 load 一次，然后再 show；再失败就结束流程
                this._rewardedVideoAvailableMap.set(adUnitId, false);
                this.loadRewardedVideo(adUnitId);
                this.waitForRewardedReady(adUnitId, wxAdManager.WAIT_READY_TIMEOUT_MS).then((ready) => {
                    if (!ready) {
                        throw showErr;
                    }
                    return rewardedVideoAd.show();
                }).catch((lastErr: { errCode?: number }) => {
                    if (this._rewardedVideoShowPendingMap.get(adUnitId) === resolve) {
                        this._rewardedVideoShowPendingMap.delete(adUnitId);
                    }
                    const errCode = lastErr && lastErr.errCode;
                    this.showToast(this.getRewardedErrorMessage(errCode));
                    resolve({
                        shown: false,
                        completed: false,
                        reason: "rewarded_show_fail_" + (errCode != null ? errCode : "unknown")
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
        this._rewardedVideoLoadingMap.clear();
        this._rewardedVideoWaitersMap.clear();
        this._rewardedVideoLastErrMap.clear();
        this._rewardedVideoShowPendingMap.clear();
        this._rewardedVideoOnLoadHandlerMap.clear();
        this._rewardedVideoOnErrorHandlerMap.clear();
        this._rewardedVideoOnCloseHandlerMap.clear();
        this._interstitialAdMap.forEach(ad => ad.destroy());
        this._interstitialAdMap.clear();
        this._bannerAdMap.forEach(ad => ad.destroy());
        this._bannerAdMap.clear();
        this._activeBannerId = "";
    }
}
