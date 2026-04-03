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
    showRewardedVideo(): Promise<IRewardedVideoResult>;
    showInterstitial(): Promise<boolean>;
    showBanner(style?: any): void;
    hideBanner(): void;
    destroyAll(): void;
}

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
    shareAppMessage(title?: string, imageUrl?: string, query?: string): Promise<boolean>;
    postMaxLevel(level: number): void;
    showRank(): void;
    hideRank(): void;
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
