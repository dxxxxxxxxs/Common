import { IPlatform, IPlatformAd, IPlatformAdConfig, IRewardedVideoResult, ShareConfigProvider } from "./Platform";

export class WebPlatformAd implements IPlatformAd {
    init(_config: IPlatformAdConfig) { }

    isSupported() {
        return false;
    }

    isRewardedVideoAvailable() {
        return true;
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

    setShareProvider(_provider: ShareConfigProvider) { }

    addOnShowListener(_callback: (query: Record<string, string>) => void) { }

    async shareAppMessage(_title?: string, _imageUrl?: string, _query?: string): Promise<boolean> {
        return true;
    }

    postMaxLevel(_level: number) { }

    showRank() { }

    hideRank() { }
    
    openGameClub(path: string) { }
}