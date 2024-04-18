import { EncryptUtil } from "./EncryptUtil";

const {ccclass} = cc._decorator;

@ccclass
export class StorageManager {
    private static _instance:StorageManager;
    public static get Instance()
    {
        if(this._instance==null)
        {
            this._instance=new StorageManager();
            this._instance.init();
        }
        return this._instance as StorageManager;
    }
    private constructor(){}

    private init(){
        EncryptUtil.initCrypto("key","vi");
    }
    /**
     * 本地保存数据
     */
    setItem(key: string ,value: any){
        if(value === undefined || value === null){
            console.warn(`本地存储数据非法,key:${key}`);
            return;
        }
        let valueType = typeof(value);
        if(valueType === "number" && isNaN(value)){
            console.warn(`本地存储数据为NaN,key:${key}`);
            return;
        }
        //转换数据
        if(valueType === "number"){
            value = value.toString();
        }else if(valueType === "boolean"){
            //boolean类型转换为0或1
            value = value ? "1" : "0";
        }else if(valueType === "object"){
            //数组或者map类型转换为json字符串
            value = JSON.stringify(value);
        }

        //加密数据
        let newvalue = EncryptUtil.aesEncrypt(value);
        cc.sys.localStorage.setItem(key,newvalue);
    } 

    /**
     * 读取数据
     * @param key 数据对应key
     * @param defaultValue 默认数据
     */
    getItem(key: string ,defaultValue: any = ""){
        let value = cc.sys.localStorage.getItem(key);
        //数据获取失败，走默认数据
        if(value === null){
            return defaultValue;
        }

        //解密数据
        let newvalue = EncryptUtil.aesDecrypt(value);
        //检测是否为json字符串
        const regex = /^\s*{[\s\S]*}\s*$/;
        if(regex.test(value)){
            return JSON.parse(newvalue);
        }
        return value;
    }
}
