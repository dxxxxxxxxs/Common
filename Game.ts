// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { AudioManager } from "./Audio/AudioManager";
import { EventManager } from "./Event/EventManager";
import HttpManager from "./Http/HttpManager";
import ObjectPool from "./Pool/ObjectPool";


const { ccclass, property } = cc._decorator;

@ccclass
export default class Game {
    public static get Event() { return EventManager.Instance }
    public static get Audio() { return AudioManager.Instance }
    public static get ObjectPool() { return ObjectPool.Instance }
    public static get Http() { return HttpManager.Instance }

    private static doGet(url: string, data?: any, complete?: Function, error?: Function, header?: { name: string, value: string }) {
        //后续在这个里面控制请求头，需要与服务器沟通，更改请求头header
        this.Http.doGet(url, data, complete, error, header);
    }
    private static doPost(url: string, data?: any, complete?: Function, error?: Function, header?: { name: string, value: string }) {
        //后续在这个里面控制请求头，需要与服务器沟通，更改请求头header
        this.Http.doPost(url, data, complete, error, header);
    }
    public static async doGetAsync<T>(url: string, reqData: any): Promise<T> {
        return new Promise<T>((resolve) => {
            this.doGet(url, reqData, (data: any) => {
                console.log(url + "Sucess=>", data);
                //与服务器沟通返回的数据里面的错误类型，一般是0或者200表示成功，其他的为错
                if (data.code == 0 || data.code == 200) {
                    resolve(data.data);
                }
                else {
                    resolve(null);
                    console.log(url + "Error=>code:", data.code);
                }
            }, (error: any) => {
                console.log(url + "Error=>", error);
                resolve(null);
            }, null);
        })
    }
    public static async doPostAsync<T>(url: string, reqData: any): Promise<T> {
        return new Promise<T>((resolve) => {
            this.doGet(url, reqData, (data: any) => {
                console.log(url + "Sucess=>", data);
                //与服务器沟通返回的数据里面的错误类型，一般是0或者200表示成功，其他的为错
                if (data.code == 0 || data.code == 200) {
                    resolve(data.data);
                }
                else {
                    resolve(null);
                    console.log(url + "Error=>code:", data.code);
                }
            }, (error: any) => {
                console.log(url + "Error=>", error);
                resolve(null);
            }, null);
        })
    }
}
