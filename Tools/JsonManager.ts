// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import BundleManager from "../Bundle/BundleManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class JsonManager {

    private static _instance: JsonManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new JsonManager();
        }
        return this._instance as JsonManager;
    }

    async jsonConvert(jsonName: string): Promise<cc.JsonAsset> {
        return new Promise<cc.JsonAsset>(async (resovlve) => {
            const jsonData = await BundleManager.load<cc.JsonAsset>("json/" + jsonName, "Game");
            resovlve(jsonData);
        })

    }

}
