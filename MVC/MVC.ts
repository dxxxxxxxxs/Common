// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html


import { Controller } from "./Controller";
import { Model } from "./Model";
import { View } from "./View";

const { ccclass, property } = cc._decorator;

@ccclass
export class MVC {
    private static _instance: MVC;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new MVC();
        }
        return this._instance as MVC;
    }


    public static Models: Map<string, Model> = new Map<string, Model>();
    public static Views: Map<string, View> = new Map<string, View>();
    public static CommandMap: Map<string, any> = new Map<string, any>();

    private constructor() {

    }


    /**注册View */
    public static RegisterView(view: View) {
        if (Object.values(this.Views).includes(view)) {
            this.Views.delete(view.Name);
        }
        view.RegisterAttentionEvent();
        this.Views.set(view.Name, view);
    }

    /**注册Model */
    public static RegisterModel(model: Model) {
        this.Models.set(model.Name, model);
    }

    /**注册Controller */
    public static RegisterController(eventName: string, controllerType: any) {
        this.CommandMap.set(eventName, controllerType);
    }

    /**获取model */
    public static GetModel<T extends Model>(constructor: new () => T): T {
        for (let m in this.Models) {
            if (this.Models.get(m).constructor instanceof constructor) {
                return this.Models.get(m) as T;
            }
        }
        return null;
    }

    /**获取View */
    public static GetView<T extends View>(constructor: new () => T): T {
        for (let v in this.Views) {
            if (this.Views.get(v) instanceof constructor) {
                return this.Views.get(v) as T;
            }
        }
        return null;
    }

    public static SendEvent(eventName: string, data: any = null): void {
        // controller 执行
        if (this.CommandMap[eventName]) {
            let controllerType = this.CommandMap[eventName];
            let controller: Controller = new controllerType() as Controller;
            controller.Execute(data);
        }

        // view 处理
        for (let key in this.Views) {
            let view = this.Views[key];
            if (view.AttentionList.includes(eventName)) {
                view.HandleEvent(eventName, data);
            }
        }
    }

}
