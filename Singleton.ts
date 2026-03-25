export default abstract class Singleton {
    protected static _instance: any = null;

    public static get Instance() {
        if (!this.hasOwnProperty('_instance') || this._instance == null) {
            this._instance = new (this as any)();
        }
        return this._instance;
    }

    protected constructor() {}
}
