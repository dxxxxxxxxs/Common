import { IPlatform, IPlatformAd, IPlatformAdConfig, IRewardedVideoResult } from "./Platform";

export class WebPlatformAd implements IPlatformAd {
    init(_config: IPlatformAdConfig) { }

    isSupported() {
        return false;
    }

    async showRewardedVideo(): Promise<IRewardedVideoResult> {
        return { shown: false, completed: true, reason: "web_passthrough" };
    }

    async showInterstitial(): Promise<boolean> {
        return false;
    }

    showBanner(_style?: any) { }

    hideBanner() { }

    destroyAll() { }
}

export class WebPlatform implements IPlatform {
    public readonly name: string = "web";
    public readonly isWxPlatform: boolean = false;
    public readonly supportsRank: boolean = false;
    public readonly supportsShare: boolean = false;
    public readonly Ad: IPlatformAd = new WebPlatformAd();

    onShow() { }

    onHide() { }

    getWindowInfo() {
        return null;
    }

    initShare(_title: string, _imageUrl: string, _timelineTitle?: string) { }

    postMaxLevel(_level: number) { }

    showRank() { }

    hideRank() { }
}