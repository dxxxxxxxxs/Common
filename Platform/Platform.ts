import Singleton from "../Singleton";
import { wxManager } from "../WX/wxManager";
import { WebPlatform } from "./WebPlayform";

export interface IRewardedVideoResult {
    shown: boolean;
    completed: boolean;
    reason?: string;
}

export interface IPlatformAdConfig {
    rewardedVideoIds?: string[];
    interstitialIds?: string[];
    bannerIds?: string[];
}

export interface IPlatformAd {
    init(config: IPlatformAdConfig): void;
    isSupported(): boolean;
    isRewardedVideoAvailable(): boolean;
    showRewardedVideo(): Promise<IRewardedVideoResult>;
    showInterstitial(): Promise<boolean>;
    showBanner(style?: any): void;
    hideBanner(): void;
    destroyAll(): void;

    /**
     * 主动预加载激励视频。可在"可能触发广告的页面"打开时主动调用，
     * 让 load 发生在用户点按钮之前，展示时就不用再等。
     */
    preloadRewardedVideo(): void;

    /**
     * 小游戏从后台切回前台时调用，用于重置可能已过期的广告状态、重新 load。
     */
    onGameShow(): void;
}

export interface ShareConfig {
    title: string;
    imageUrl?: string;
    query?: string;
}

export type ShareConfigProvider = () => ShareConfig;

export interface IPlatform {
    readonly name: string;
    readonly isWxPlatform: boolean;
    readonly supportsRank: boolean;
    readonly supportsShare: boolean;
    readonly Ad: IPlatformAd;

    onShow(): void;
    onHide(): void;
    getWindowInfo(): any;
    initShare(title: string, imageUrl: string, timelineTitle?: string): void;
    setShareProvider(provider: ShareConfigProvider): void;
    addOnShowListener(callback: (query: Record<string, string>) => void): void;
    shareAppMessage(title?: string, imageUrl?: string, query?: string): Promise<boolean>;
    postMaxLevel(level: number): void;
    showRank(): void;
    hideRank(): void;
    openGameClub(path: string): void;
}

export class PlatformManager extends Singleton {
    public static get Instance(): PlatformManager {
        return this.getSingletonInstance() as PlatformManager;
    }

    private _platform: IPlatform = null;

    public get current(): IPlatform {
        if (!this._platform) {
            this._platform = this.createPlatform();
        }
        return this._platform;
    }

    private createPlatform(): IPlatform {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            return wxManager.Instance;
        }
        return new WebPlatform();
    }
}
