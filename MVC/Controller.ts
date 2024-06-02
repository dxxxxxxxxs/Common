// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { MVC } from "./MVC";
import { Model } from "./Model";
import { View } from "./View";

const { ccclass, property } = cc._decorator;

@ccclass
export abstract class Controller {
    /**执行事件 */
    public abstract Execute(data: Object);

    /**获取model */
    protected GetModel<T extends Model>(controller: new () => T) {
        return MVC.GetModel<T>(controller) as T;
    }

    /**获取View */
    protected GetView<T extends View>(controller: new () => T) {
        return MVC.GetView<T>(controller) as T;
    }


}
