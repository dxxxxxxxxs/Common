import 'minigame-api-typings';
export class wxManager {
    private static _instance: wxManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new wxManager();
        }
        return this._instance as wxManager;
    }
    private constructor() { }

    /**游戏切回前台 */
    onShow() {
        wx.onShow(res => {
            console.log(res);
        })
    }

    /**游戏切到后台 */
    onHide() {
        wx.onHide(res => {
            console.log(res);
        })
    }

    /**获取窗口数据 */
    getWindowInfo() {
        return wx.getWindowInfo();
    }
}