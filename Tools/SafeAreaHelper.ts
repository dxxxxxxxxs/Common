/**
 * SafeAreaHelper
 * 小游戏屏幕安全区适配工具。
 *
 * 背景：
 *   在 iPhone X 及以上机型（刘海屏 / 灵动岛）上，屏幕顶部会被系统状态栏遮挡；
 *   微信小游戏的胶囊按钮（· · · 和 X）固定在右上角，也是一个不可用区域；
 *   iPhone 全面屏底部的 Home Indicator 也需要避让。
 *
 * 策略：
 *   1. 项目采用 FIXED_WIDTH 策略（设计 720×1280，宽度撑满，高度按屏幕比例扩展）。
 *   2. 长屏手机上设计分辨率之外会自然多出"上下扩展区"。
 *   3. 本工具在启动时计算一次所有关键偏移值并缓存，UI 层直接按需使用。
 *
 * 典型用法：
 *   // UI 顶部按钮往上挪，占用扩展区而非挤占游戏内容
 *   btn.y += SafeAreaHelper.topLiftOffset;
 *
 *   // 关闭按钮避开微信胶囊
 *   SafeAreaHelper.shiftAwayFromMenuButton(btnClose);
 */
export default class SafeAreaHelper {
    /** 是否已完成初始化 */
    private static _initialized: boolean = false;

    /** 设计分辨率宽度（默认 720） */
    private static _designWidth: number = 720;
    /** 设计分辨率高度（默认 1280） */
    private static _designHeight: number = 1280;

    /** 实际屏幕高度换算到设计分辨率单位后的值（长屏手机 > 设计高度） */
    private static _screenDesignHeight: number = 1280;

    /** 刘海/系统状态栏的高度（设计分辨率单位） */
    private static _notchInsetDesign: number = 0;

    /** 底部 Home Indicator 高度（设计分辨率单位） */
    private static _bottomInsetDesign: number = 0;

    /** 微信胶囊按钮在 Canvas 局部坐标中的矩形信息（可能为 null） */
    private static _menuBtnRect: { left: number; right: number; top: number; bottom: number } | null = null;

    /**
     * 初始化安全区参数，应在 Canvas/DesignResolution 设置好之后调用一次。
     * @param designWidth  设计分辨率宽度（默认 720）
     * @param designHeight 设计分辨率高度（默认 1280）
     */
    public static init(designWidth: number = 720, designHeight: number = 1280): void {
        this._designWidth = designWidth;
        this._designHeight = designHeight;

        // 当前设备实际可视高度（按设计分辨率单位换算）
        const visible = cc.view.getVisibleSize();
        this._screenDesignHeight = visible.height;

        // 读取微信小游戏环境信息
        const wxGlobal: any = typeof wx !== "undefined" ? wx : null;
        if (wxGlobal && typeof wxGlobal.getSystemInfoSync === "function") {
            try {
                const sys = wxGlobal.getSystemInfoSync();
                const screenWidthPx = sys.screenWidth || sys.windowWidth || designWidth;
                // 物理像素 -> 设计分辨率像素 的换算系数
                const pxToDesign = designWidth / screenWidthPx;

                // 刘海/状态栏：safeArea.top 即为顶部不可用区高度
                if (sys.safeArea && typeof sys.safeArea.top === "number") {
                    this._notchInsetDesign = sys.safeArea.top * pxToDesign;
                }
                if (sys.safeArea && typeof sys.screenHeight === "number") {
                    const bottomPx = sys.screenHeight - sys.safeArea.bottom;
                    this._bottomInsetDesign = Math.max(0, bottomPx) * pxToDesign;
                }

                // 胶囊按钮位置：换算到 Canvas 以屏幕中心为原点的坐标系
                if (typeof wxGlobal.getMenuButtonBoundingClientRect === "function") {
                    const rect = wxGlobal.getMenuButtonBoundingClientRect();
                    if (rect) {
                        const screenHeightPx = sys.screenHeight || sys.windowHeight || designHeight;
                        // 微信 rect 左上原点 -> Cocos 中心原点（向上为正 Y）
                        const leftDesign = (rect.left - screenWidthPx / 2) * pxToDesign;
                        const rightDesign = (rect.right - screenWidthPx / 2) * pxToDesign;
                        const topDesign = (screenHeightPx / 2 - rect.top) * pxToDesign;
                        const bottomDesign = (screenHeightPx / 2 - rect.bottom) * pxToDesign;
                        this._menuBtnRect = {
                            left: leftDesign,
                            right: rightDesign,
                            top: topDesign,
                            bottom: bottomDesign,
                        };
                    }
                }
            } catch (e) {
                console.warn("SafeAreaHelper.init 读取微信系统信息失败", e);
            }
        }

        this._initialized = true;

        console.log(
            `[SafeAreaHelper] designHeight=${designHeight}, screenDesignHeight=${this._screenDesignHeight.toFixed(1)}, ` +
            `notchInset=${this._notchInsetDesign.toFixed(1)}, bottomInset=${this._bottomInsetDesign.toFixed(1)}, ` +
            `menuBtnRect=${this._menuBtnRect ? JSON.stringify(this._menuBtnRect) : "null"}`
        );
    }

    /** 设计分辨率宽度 */
    public static get designWidth(): number { return this._designWidth; }
    /** 设计分辨率高度 */
    public static get designHeight(): number { return this._designHeight; }

    /**
     * 当前屏幕顶部扩展区域高度（仅长屏手机有，短屏为 0）
     * 这块区域在设计分辨率之外、不会被游戏内容占用，适合放顶部按钮
     */
    public static get topExtendedArea(): number {
        return Math.max(0, (this._screenDesignHeight - this._designHeight) / 2);
    }

    /**
     * 当前屏幕底部扩展区域高度（仅长屏手机有，短屏为 0）
     */
    public static get bottomExtendedArea(): number {
        return Math.max(0, (this._screenDesignHeight - this._designHeight) / 2);
    }

    /**
     * 顶部按钮 "相对原设计位置" 应向上平移的偏移量（单位：设计像素）。
     * 返回值是正数；设计时你照常把按钮摆在屏幕顶边（y ≈ designHeight/2），
     * 运行时调用此偏移把按钮推到扩展区，就正好落在刘海下方可见区域。
     *
     * 计算：扩展区高度 - 余量（留出和刘海的距离）
     */
    public static get topLiftOffset(): number {
        if (!this._initialized) return 0;
        // 在扩展区里尽量往上抬，但留出和刘海的距离（刘海底部以下 10 像素）
        const extend = this.topExtendedArea;
        if (extend <= 0) return 0;
        const margin = 10;
        const maxLift = extend - Math.max(0, this._notchInsetDesign - this._designHeight / 2) - margin;
        return Math.max(0, maxLift);
    }

    /**
     * 顶部按钮的"推荐 y 坐标"：在微信胶囊按钮垂直中心。
     * 若胶囊信息不可得，返回设计顶 + 扩展区一半。
     */
    public static getMenuAlignedY(): number {
        if (this._menuBtnRect) {
            return (this._menuBtnRect.top + this._menuBtnRect.bottom) / 2;
        }
        return this._designHeight / 2 + this.topExtendedArea / 2;
    }

    /**
     * 胶囊按钮左边缘的 X（设计坐标，原点在屏幕中心）。若不可得返回 null。
     * 任何放在屏幕右侧的按钮应保证 x + 半宽 <= menuLeftX - 安全间距
     */
    public static get menuButtonLeftX(): number | null {
        return this._menuBtnRect ? this._menuBtnRect.left : null;
    }

    /** 胶囊按钮下边缘的 Y（设计坐标）。若不可得返回 null。 */
    public static get menuButtonBottomY(): number | null {
        return this._menuBtnRect ? this._menuBtnRect.bottom : null;
    }

    /** 刘海在设计坐标下占据的"顶部不可用高度"（从屏幕顶向下计） */
    public static get notchInsetDesign(): number { return this._notchInsetDesign; }
    /** 底部 Home Indicator 占据的高度（设计坐标） */
    public static get bottomInsetDesign(): number { return this._bottomInsetDesign; }

    /**
     * 把一个节点"推进"顶部扩展区。
     * 如果节点原本在设计区顶部（y ≈ designHeight/2 附近），调用后会落在刘海下方的扩展区内。
     * 短屏手机上该函数不做任何改动（扩展区为 0）。
     * @param node        要处理的节点
     * @param extraMargin 额外下移量（比如让按钮离刘海再远一点），默认 0
     */
    public static liftToTopExtended(node: cc.Node, extraMargin: number = 0): void {
        if (!node || !this._initialized) return;
        const lift = this.topLiftOffset - extraMargin;
        if (lift <= 0) return;
        node.y += lift;
    }

    /**
     * 让一个位于屏幕右上角的按钮避开微信胶囊。
     * 策略：若按钮的右边缘进入了胶囊水平范围，就向左平移到胶囊左侧（减去安全间距）。
     * @param node   目标节点（应已放到你期望的顶部位置）
     * @param margin 与胶囊左边缘的最小间距，默认 20
     */
    public static shiftAwayFromMenuButton(node: cc.Node, margin: number = 20): void {
        if (!node || !this._initialized) return;
        if (!this._menuBtnRect) return;

        const halfW = node.width * (node.scaleX || 1) / 2;
        const rightEdge = node.x + halfW;
        const limit = this._menuBtnRect.left - margin;
        if (rightEdge > limit) {
            node.x = limit - halfW;
        }
    }

    /**
     * 便捷方法：把节点移动到"胶囊水平中线 + 胶囊左侧"的位置。
     * 适合弹窗右上角的关闭按钮。
     * @param node   目标节点（通常是 btnClose）
     * @param offsetX 相对胶囊左侧再往左 offsetX 像素
     */
    public static placeAtMenuLeftTop(node: cc.Node, offsetX: number = 40): void {
        if (!node || !this._initialized || !this._menuBtnRect) return;
        node.x = this._menuBtnRect.left - offsetX;
        node.y = (this._menuBtnRect.top + this._menuBtnRect.bottom) / 2;
    }
}
