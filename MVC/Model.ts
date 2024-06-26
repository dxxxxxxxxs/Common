// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { MVC } from "./MVC";

const { ccclass, property } = cc._decorator;

@ccclass
export abstract class Model {
    /**名字标识 */
    public abstract Name: string;

    /**发送事件 */
    protected SendEvent(eventName: string, data: Object = null) {
        MVC.SendEvent(eventName, data);
    }
}
