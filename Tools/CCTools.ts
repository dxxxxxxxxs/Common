// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import BundleManager from "../Bundle/BundleManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class CCTools extends cc.Component {
    public static isValidEmail(email: string): boolean {
        // 邮箱地址的正则表达式 
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // 使用正则表达式验证输入字符串
        return emailRegex.test(email);
    }

    /**
     * 添加一个节点
     * @param parent 父节点 
     * @param name 节点名称
     * @param size 节点大小
     */
    public static addNode(parent: cc.Node, name?: string, size: cc.Size = cc.view.getVisibleSize()): cc.Node {
        let node = new cc.Node(name);
        node.setContentSize(size);
        parent.addChild(node);
        return node;
    }

    /**
     * 将传入的邮箱地址变为（首字符+****+尾字符+@+首字符+****+尾字符）
     * @param email 需要隐藏的邮箱地址
     * @returns 
     */
    static convertEmail(email: string): string {
        const atIndex = email.indexOf('@'); // 获取邮箱中 @ 符号的索引位置
        const firstChar = email.charAt(0); // 获取邮箱的首字符
        const lastChar = email.charAt(atIndex - 1);
        const firstChar2 = email.charAt(atIndex + 1);
        const lastChar2 = email.charAt(email.length - 1);
        const convertedEmail = `${firstChar}****${lastChar}@${firstChar2}****${lastChar2}`; // 拼接转换后的邮箱字符串
        return convertedEmail;
    }

    /**寻找子物体 */
    static findChild(parent: cc.Node, name: string): cc.Node {
        return parent.getChildByName(name);
    }

    /**添加点击事件 */
    static fixedClick(node: cc.Node, callback: Function, target: any) {
        let button;
        if (node.getComponent(cc.Button)) {
            button = node.getComponent(cc.Button);
        } else {
            button = node.addComponent(cc.Button);
        }
        button.transition = cc.Button.Transition.SCALE;
        button.duration = 0.1;
        button.zoomScale = 1.1;
        node.on("click", callback, target);
    }

    /**
     * 获取一个随机数
     * @param min 最小值
     * @param max 最大值
     * @param integer 是否返回整数
     * @returns 
     */
    static Random(min: number, max: number, integer: boolean = true): number {
        let randomValue: number;
        if (integer) {
            randomValue = Math.floor(Math.random() * (max - min + 1));
        } else {
            randomValue = Math.random() * (max - min);
        }
        return randomValue;
    }

    /**
     * 替换节点上的资源（图片、spine等）
     * @param node 
     * @param path 
     * @param bundleName 
     */
    public static async fix(node: cc.Node, path: string, bundleName: string) {
        const asset: cc.SpriteFrame = await BundleManager.load<cc.SpriteFrame>(path, bundleName);
        node.getComponent(cc.Sprite).spriteFrame = asset as cc.SpriteFrame;
        console.log("替换资源成功 " + (asset as cc.SpriteFrame).name);
    }

    /**
     * 将a移动到b，对于a来说，b的坐标
     * @param a 
     * @param b 
     * @returns 
     */
    static getRelativePosition(a: cc.Node, b: cc.Node): cc.Vec2 {
        let positionB = b.convertToWorldSpaceAR(cc.v2(0, 0));
        let relativePosition = a.parent.convertToNodeSpaceAR(positionB);
        return relativePosition;
    }

    /**
     * 将节点的父节点更改为传入的新节点，但是使其显示在屏幕上的位置不变
     * @param node 节点
     * @param newParent 新父节点 
     */
    static changeParentAndKeepPosition(node: cc.Node, newParent: cc.Node) {
        // 获取节点在世界坐标系中的位置
        let worldPos = node.parent.convertToWorldSpaceAR(node.position);

        // 将节点从原父节点中移除
        node.removeFromParent(false);

        // 将节点添加到新的父节点中
        newParent.addChild(node);
        node.active = false;
        // 将节点设置回原来的世界坐标位置（新父节点的本地坐标）
        node.position = newParent.convertToNodeSpaceAR(worldPos);

        node.active = true;
        console.log("父节点坐标" + newParent.position);
    }


}
