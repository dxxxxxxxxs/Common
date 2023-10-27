// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class HttpManager {

    private static _instance: HttpManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new HttpManager();
        }
        return this._instance as HttpManager;
    }

    doGet(url: string, data?: any, complete?: Function, error?: Function, header?: { name: string, value: string }) {
        let request: XMLHttpRequest = this.getRequest("GET", url, complete, error, header);
        request.send();
    }
    doPost(url: string, data?: any, complete?: Function, error?: Function, header?: { name: string, value: string }) {
        let request: XMLHttpRequest = this.getRequest("POST", url, complete, error, header);
        request.send(data);
    }
    private getRequest(method: string, url: string, complete: Function, error: Function, header?: { name: string, value: string }): XMLHttpRequest {
        let request: XMLHttpRequest = cc.loader.getXMLHttpRequest();//也可以new一个XMLHttpRequest对象
        //用于初始化一个HTTP请求，三个参数1.请求方法（GET，POST等）2.请求的URL 3.是否异步发送请求（默认为true）
        request.open(method, url);
        if (header) {
            //用于设置HTTP请求头，两个参数1.请求头的名称，2.请求头的值
            request.setRequestHeader(header.name, header.value);
        }
        //当XMLHttpRequest对象的readyState属性发生变化时，即当请求的状态发生改变时，会触发onreadystatechange事件
        request.onreadystatechange = () => {
            //readyState属性表示XMLHttpRequest对象的状态，有以下几种可能的值：
            // 0: 未初始化，XMLHttpRequest对象已创建，但尚未调用open方法。
            // 1: 启动，open方法已调用，但尚未调用send方法。
            // 2: 发送，send方法已调用，但尚未接收到服务器的响应。
            // 3: 接收，正在接收服务器的响应数据。
            // 4: 完成，服务器的响应数据已完全接收。

            // status属性表示服务器响应的HTTP状态码，常见的状态码有：
            // 200: 请求成功。
            // 404: 请求的资源未找到。
            // 500: 服务器内部错误。
            if (request.readyState == 4 && request.status >= 200 && request.status < 400) {
                try {
                    let res = JSON.parse(request.responseText);
                    if (complete) {
                        complete(res);
                    }
                } catch (error) {
                    if (error) {
                        error(error);
                    }
                }
            }
        }
        request.onerror = (err) => {
            if (err) {
                if (error) {
                    error(err)
                }
            }
        }
        return request;
    }
}
