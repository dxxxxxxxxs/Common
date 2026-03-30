// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html


import { Controller } from "./Controller";
import { Model } from "./Model";
import { View } from "./View";
import Singleton from "../Singleton";

const { ccclass, property } = cc._decorator;

@ccclass
export class MVC extends Singleton {
    public static get Instance(): MVC {
        return this.getSingletonInstance() as MVC;
    }

    public static Models: Map<string, Model> = new Map<string, Model>();
    public static Views: Map<string, View> = new Map<string, View>();
    public static CommandMap: Map<string, any> = new Map<string, any>();

    protected constructor() { super(); }


    /**注册View */
    public static RegisterView(view: View) {
        if (!view || !view.Name) {
            return;
        }
        view.AttentionList.clear();
        view.RegisterAttentionEvent();
        this.Views.set(view.Name, view);
    }

    /**注册Model */
    public static RegisterModel(model: Model) {
        if (!model || !model.Name) {
            return;
        }
        this.Models.set(model.Name, model);
    }

    /**注册Controller */
    public static RegisterController(eventName: string, controllerType: any) {
        if (!eventName || !controllerType) {
            return;
        }
        this.CommandMap.set(eventName, controllerType);
    }

    /**移除View */
    public static RemoveView(viewName: string) {
        this.Views.delete(viewName);
    }

    /**移除Model */
    public static RemoveModel(modelName: string) {
        this.Models.delete(modelName);
    }

    /**移除Controller */
    public static RemoveController(eventName: string) {
        this.CommandMap.delete(eventName);
    }

    /**获取model */
    public static GetModel<T extends Model>(constructor: new () => T): T {
        for (const model of this.Models.values()) {
            if (model instanceof constructor) {
                return model;
            }
        }
        return null;
    }

    /**获取View */
    public static GetView<T extends View>(constructor: new () => T): T {
        for (const view of this.Views.values()) {
            if (view instanceof constructor) {
                return view;
            }
        }
        return null;
    }

    public static SendEvent(eventName: string, data: any = null): void {
        // controller 执行
        let controllerType = this.CommandMap.get(eventName);
        if (controllerType) {
            let controller: Controller = new controllerType() as Controller;
            controller.Execute(data);
        }

        // view 处理
        for (const view of this.Views.values()) {
            if (view.AttentionList.has(eventName)) {
                view.HandleEvent(eventName, data);
            }
        }
    }

}
