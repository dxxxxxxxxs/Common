import I18nManager from "./I18nManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class i18nLabel extends cc.Component {
    @property({
        displayName: "Text Key",
        tooltip: "填写语言表中的文本 key",
    })
    textKey: string = "";

    private _label: cc.Label = null;
    private _richText: cc.RichText = null;
    private _defaultText: string = "";

    protected onLoad(): void {
        this.cacheTextComponent();
    }

    protected onEnable(): void {
        I18nManager.Instance.registerLabel(this);
    }

    protected onDisable(): void {
        I18nManager.Instance.unregisterLabel(this);
    }

    public refreshLabel() {
        this.cacheTextComponent();
        const textComponent = this.getTextComponent();
        if (!textComponent) {
            cc.warn("[i18nLabel] 节点上没有找到 Label 或 RichText 组件: " + this.node.name);
            return;
        }

        if (!this._defaultText) {
            this._defaultText = textComponent.string;
        }

        if (!this.textKey) {
            return;
        }

        textComponent.string = I18nManager.Instance.t(this.textKey, this._defaultText);
    }

    private cacheTextComponent() {
        if (!this._label) {
            this._label = this.getComponent(cc.Label);
        }
        if (!this._richText) {
            this._richText = this.getComponent(cc.RichText);
        }

        const textComponent = this.getTextComponent();
        if (textComponent && !this._defaultText) {
            this._defaultText = textComponent.string;
        }
    }

    private getTextComponent(): cc.Label | cc.RichText {
        return this._label || this._richText;
    }
}
