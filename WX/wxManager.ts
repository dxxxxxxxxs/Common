/// <reference types="minigame-api-typings" />
import { wxAdManager } from "./wxAdManager";
export class wxManager {
    private static _instance: wxManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new wxManager();
        }
        return this._instance as wxManager;
    }
    private constructor() { }

    private get hasWx() {
        return typeof wx !== "undefined";
    }

    /**游戏切回前台 */
    onShow() {
        if (!this.hasWx) return;
        wx.onShow(res => {
            console.log(res);
        })
    }

    /**游戏切到后台 */
    onHide() {
        if (!this.hasWx) return;
        wx.onHide(res => {
            console.log(res);
        })
    }

    /**获取窗口数据 */
    getWindowInfo() {
        if (!this.hasWx) return null;
        return wx.getWindowInfo();
    }

    showShareMenu() {
        if (!this.hasWx) return;
        wx.showShareMenu({
            menus: ['shareAppMessage', 'shareTimeline']
        });
    }

    onShareAppMessage(title: string, imageUrl: string) {
        if (!this.hasWx) return;
        wx.onShareAppMessage(() => ({
            title: title,
            imageUrl: imageUrl
        }));
    }

    onShareTimeline(title: string, imageUrl: string) {
        if (!this.hasWx) return;
        wx.onShareTimeline(() => ({
            title: title,
            imageUrl: imageUrl
        }));
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
        ctx.postMessage({ type: "showRank" });
    }

    /**通知开放数据域隐藏排行榜 */
    hideRank() {
        if (!this.hasWx) return;
        const ctx = wx.getOpenDataContext();
        ctx.postMessage({ type: "hideRank" });
    }
}