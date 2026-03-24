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
}