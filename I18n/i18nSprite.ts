
import BundleManager from "../Bundle/BundleManager";
import I18nManager from "./I18nManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class i18nSprite extends cc.Component {
    @property({
        displayName: "Sprite Key",
        tooltip: "填写图片语言表中的 key",
    })
    spriteKey: string = "";

    private _sprite: cc.Sprite = null;
    private _defaultSpriteFrame: cc.SpriteFrame = null;
    private _loadVersion: number = 0;

    protected onLoad(): void {
        this.cacheSprite();
    }

    protected onEnable(): void {
        I18nManager.Instance.registerSprite(this);
    }

    protected onDisable(): void {
        this._loadVersion++;
        I18nManager.Instance.unregisterSprite(this);
    }

    public async refreshSprite() {
        this.cacheSprite();
        if (!this._sprite) {
            cc.warn("[i18nSprite] 节点上没有找到 Sprite 组件: " + this.node.name);
            return;
        }

        if (!this.spriteKey) {
            return;
        }

        const config = I18nManager.Instance.getSpriteConfig(this.spriteKey);
        if (!config || !config.bundle || !config.path) {
            this.applyDefaultSpriteFrame();
            return;
        }

        const loadVersion = ++this._loadVersion;
        const spriteFrame = await BundleManager.load<cc.SpriteFrame>(config.path, config.bundle, cc.SpriteFrame);
        if (!cc.isValid(this.node) || loadVersion !== this._loadVersion) {
            return;
        }

        if (this.isValidSpriteFrame(spriteFrame)) {
            this._sprite.spriteFrame = spriteFrame;
        } else {
            this.applyDefaultSpriteFrame();
            cc.warn("[i18nSprite] 加载图片失败, key: " + this.spriteKey + ", bundle: " + config.bundle + ", path: " + config.path);
        }
    }

    private cacheSprite() {
        if (!this._sprite) {
            this._sprite = this.getComponent(cc.Sprite);
        }
        if (this._sprite && !this._defaultSpriteFrame && this.isValidSpriteFrame(this._sprite.spriteFrame)) {
            this._defaultSpriteFrame = this._sprite.spriteFrame;
        }
    }

    private applyDefaultSpriteFrame() {
        if (!this._sprite) {
            return;
        }
        if (this.isValidSpriteFrame(this._defaultSpriteFrame)) {
            this._sprite.spriteFrame = this._defaultSpriteFrame;
        } else {
            this._sprite.spriteFrame = null;
        }
    }

    private isValidSpriteFrame(spriteFrame: any): spriteFrame is cc.SpriteFrame {
        return !!spriteFrame && typeof spriteFrame.textureLoaded === "function";
    }
}
