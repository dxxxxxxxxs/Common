const { ccclass, property } = cc._decorator;

@ccclass
export class mStorageManager {
    private static _instance: mStorageManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new mStorageManager();
        }
        return this._instance as mStorageManager;
    }

    // 保存数据
    public setItem(key: string, value: any) {
        if (value === undefined || value === null) {
            console.log(`本地存储数据非法, key:${key}`);
            return;
        }
        let valueType = typeof (value);
        if (valueType === "number" && isNaN(value)) {
            console.log(`本地存储数据为NaN, key:${key}`);
            return;
        }

        // 转换数据
        if (valueType === "number") {
            value = value.toString();
        } else if (valueType === "boolean") {
            // boolean类型转换为0或1
            value = value ? "1" : "0";
        } else if (valueType === "object") {
            // 数组或Map类型转换为JSON字符串
            value = JSON.stringify(value);
        }
        cc.sys.localStorage.setItem(key, value);
    }

    // 读取数据
    public getItem(key: string, defaultValue: any = ""): any {
        let value = cc.sys.localStorage.getItem(key);
        // 数据获取失败，就走默认设置
        if (value === null) {
            console.log(`获取本地存储数据失败，读取默认配置, key:${key}`);
            return defaultValue;
        }

        // 检测是否为JSON字符串
        const regex = /^\s*{[\s\S]*}\s*$/;
        if (regex.test(value)) {
            return JSON.parse(value);
        }
        return value;
    }

    //存储数据 wx平台
    public setWXItem(key: string, value: any) {
        if (cc.sys.platform === cc.sys.WECHAT_GAME) {
            wx.setStorage({
                key: key,
                data: value
            })
        } else {
            this.setItem(key, value);
        }

    }

    // 读取数据 wx平台
    public async getWXItem(key: string, defaultValue: any = ""): Promise<any> {
        return new Promise<any>(async (resovlve) => {
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                wx.getStorage({
                    key: key,
                    success(res) {
                        console.log("获取成功" + res.data);
                        resovlve(res.data);
                    },
                    fail(e) {
                        wx.setStorage({
                            key: key,
                            data: defaultValue,
                            success() {
                                wx.getStorage({
                                    key: key,
                                    success(restwo) {
                                        if (restwo == null || restwo == undefined) {
                                            console.log(`获取本地存储数据失败，读取默认配置, key:${key}`);
                                            resovlve(defaultValue);
                                        }
                                        console.log("获取默认配置成功" + restwo.data);
                                        resovlve(restwo.data);
                                    }
                                })
                            }
                        })
                    }
                })

            } else {
                resovlve(this.getItem(key, defaultValue));
            }

        })


    }
}
