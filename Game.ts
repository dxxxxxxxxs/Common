// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { UICF } from "../Scripts/GameConfig";
import { AudioManager } from "./Audio/AudioManager";
import { EventManager } from "./Event/EventManager";
import HttpManager from "./Http/HttpManager";
import ObjectPool from "./Pool/ObjectPool";
import JsonManager from "./Tools/JsonManager";
import { mStorageManager } from "./Tools/mStorageManager";
import { uiManager } from "./UI/UIManager";
import { wxManager } from "./WX/wxManager";


const { ccclass, property } = cc._decorator;

@ccclass
export class Game {
    /** 事件管理器 */
    public static get Event() { return EventManager.Instance }
    /** 音乐控制器 */
    public static get Audio() { return AudioManager.Instance }
    /** 对象池 */
    public static get ObjectPool() { return ObjectPool.Instance }
    /** http连接 */
    public static get Http() { return HttpManager.Instance }
    /** 本地缓存 */
    public static get Storage() { return mStorageManager.Instance }
    /** 本地缓存 */
    public static get JsonManager() { return JsonManager.Instance }

    /** WXApi */
    public static get WX() { return wxManager.Instance }

    public static bundles: Map<string, cc.AssetManager.Bundle> = new Map<string, cc.AssetManager.Bundle>();

    private static doGet(url: string, data?: any, complete?: Function, error?: Function, header?: { name: string, value: string }) {
        //后续在这个里面控制请求头，需要与服务器沟通，更改请求头header
        this.Http.doGet(url, data, complete, error, header);
    }
    private static doPost(url: string, data?: any, complete?: Function, error?: Function, header?: { name: string, value: string }) {
        //后续在这个里面控制请求头，需要与服务器沟通，更改请求头header
        this.Http.doPost(url, data, complete, error, header);
    }
    /**
     * 向服务器发送GET网络请求
     * @param url 地址
     * @param reqData 要传输的数据
     * @returns 
     */
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
    /**
     * 向服务器发送POST网络请求
     * @param url 地址
     * @param reqData 要传输的数据
     * @returns 
     */
    public static async doPostAsync<T>(url: string, reqData: any): Promise<T> {
        return new Promise<T>((resolve) => {
            this.doPost(url, reqData, (data: any) => {
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

    static initializeView(uiConf: any, uiConfMain?: any): void {
        let CF = {}
        if (uiConfMain) {
            CF = Object.assign(uiConf, uiConfMain);
        } else {
            CF = uiConf;
        }
        uiManager.initUIConf(CF);
    }


    /**初始化游戏 */
    static initialize() {
        this.initializeView(UICF);
    }
}
