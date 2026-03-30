import BundleManager from "../Bundle/BundleManager";
import Singleton from "../Singleton";
import { mStorageManager } from "../Tools/mStorageManager";

export enum I18nLanguage {
    ZH = "zh",
    EN = "en",
}

interface I18nTextItem {
    zh?: string;
    en?: string;
}

interface I18nSpritePath {
    bundle: string;
    path: string;
}

interface I18nSpriteItem {
    zh?: I18nSpritePath;
    en?: I18nSpritePath;
}

interface I18nLabelLike {
    refreshLabel(): void;
}

interface I18nSpriteLike {
    refreshSprite(): void;
}

const LANGUAGE_STORAGE_KEY = "language";

export default class I18nManager extends Singleton {
    public static get Instance(): I18nManager {
        return this.getSingletonInstance() as I18nManager;
    }
    private _language: I18nLanguage = I18nLanguage.ZH;
    private _textTable: { [key: string]: I18nTextItem } = {};
    private _spriteTable: { [key: string]: I18nSpriteItem } = {};
    private _labelSet: Set<I18nLabelLike> = new Set<I18nLabelLike>();
    private _spriteSet: Set<I18nSpriteLike> = new Set<I18nSpriteLike>();
    private _initialized: boolean = false;

    public get language() {
        return this._language;
    }

    public get initialized() {
        return this._initialized;
    }

    public async init(defaultLanguage?: I18nLanguage): Promise<void> {
        if (this._initialized) {
            await this.setLanguage(defaultLanguage || this._language);
            return;
        }

        await BundleManager.loadBundle("Game");
        const textJson = await BundleManager.load<cc.JsonAsset>("json/i18nTexts", "Game", cc.JsonAsset);
        const spriteJson = await BundleManager.load<cc.JsonAsset>("json/i18nSprites", "Game", cc.JsonAsset);

        this._textTable = (textJson && textJson.json) ? textJson.json : {};
        this._spriteTable = (spriteJson && spriteJson.json) ? spriteJson.json : {};

        const storageLanguage = mStorageManager.Instance.getItem(LANGUAGE_STORAGE_KEY, "");
        this._language = this.normalizeLanguage(storageLanguage || defaultLanguage || this.getSystemLanguage());
        mStorageManager.Instance.setItem(LANGUAGE_STORAGE_KEY, this._language);
        this._initialized = true;
        this.refreshAll();
    }

    public async setLanguage(language: string): Promise<void> {
        const nextLanguage = this.normalizeLanguage(language);
        if (!this._initialized) {
            await this.init(nextLanguage);
            return;
        }

        if (this._language === nextLanguage) {
            mStorageManager.Instance.setItem(LANGUAGE_STORAGE_KEY, this._language);
            return;
        }

        this._language = nextLanguage;
        mStorageManager.Instance.setItem(LANGUAGE_STORAGE_KEY, this._language);
        this.refreshAll();
    }

    public registerLabel(target: I18nLabelLike) {
        this._labelSet.add(target);
        if (this._initialized) {
            target.refreshLabel();
        }
    }

    public unregisterLabel(target: I18nLabelLike) {
        this._labelSet.delete(target);
    }

    public registerSprite(target: I18nSpriteLike) {
        this._spriteSet.add(target);
        if (this._initialized) {
            target.refreshSprite();
        }
    }

    public unregisterSprite(target: I18nSpriteLike) {
        this._spriteSet.delete(target);
    }

    public t(key: string, fallback: string = ""): string {
        if (!key) {
            return fallback;
        }

        const textItem = this._textTable[key];
        if (!textItem) {
            return fallback || key;
        }

        return textItem[this._language] || textItem[I18nLanguage.ZH] || textItem[I18nLanguage.EN] || fallback || key;
    }

    public text(templateOrKey: string, ...args: any[]): string {
        if (!templateOrKey) {
            return "";
        }

        const hasKey = !!this._textTable[templateOrKey];
        const template = hasKey ? this.t(templateOrKey, templateOrKey) : templateOrKey;
        return this.format(template, ...args);
    }

    public getSpriteConfig(key: string): I18nSpritePath {
        if (!key) {
            return null;
        }

        const spriteItem = this._spriteTable[key];
        if (!spriteItem) {
            return null;
        }

        return spriteItem[this._language] || spriteItem[I18nLanguage.ZH] || spriteItem[I18nLanguage.EN] || null;
    }

    private refreshAll() {
        this._labelSet.forEach(item => item.refreshLabel());
        this._spriteSet.forEach(item => item.refreshSprite());
    }

    private format(template: string, ...args: any[]): string {
        if (!template) {
            return "";
        }

        return template.replace(/\{(\d+)\}/g, (match: string, indexText: string) => {
            const index = parseInt(indexText, 10);
            if (isNaN(index) || index < 0 || index >= args.length) {
                return match;
            }

            const value = args[index];
            return value === undefined || value === null ? "" : String(value);
        });
    }

    private getSystemLanguage(): string {
        const language = ((cc.sys.language || "") + "").toLowerCase();
        if (language.indexOf("zh") >= 0 || language.indexOf("chinese") >= 0) {
            return I18nLanguage.ZH;
        }
        return I18nLanguage.EN;
    }

    private normalizeLanguage(language: string): I18nLanguage {
        const value = ((language || "") + "").toLowerCase();
        if (value.indexOf("zh") >= 0 || value.indexOf("chinese") >= 0) {
            return I18nLanguage.ZH;
        }
        return I18nLanguage.EN;
    }
}
