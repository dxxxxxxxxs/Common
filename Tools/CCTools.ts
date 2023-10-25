// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

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
}
