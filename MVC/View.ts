// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { MVC } from "./MVC";
import { Model } from "./Model";

const { ccclass, property } = cc._decorator;

@ccclass
export abstract class View {
    public abstract Name: string;

    public AttentionList: Set<string> = new Set<string>;

    public abstract RegisterAttentionEvent();

    /**处理事件 */
    public abstract HandleEvent(name: string, data: Object);

    /**发送事件 */
    protected SendEvent(eventName: string, data: Object = null) {
        MVC.SendEvent(eventName, data);
    }

    /**获取model */
    protected GetModel<T extends Model>(constructor: new () => T): T {
        return MVC.GetModel<T>(constructor) as T;
    }
}
