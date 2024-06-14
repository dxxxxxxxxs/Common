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

    /**
     * 将传入的邮箱地址变为（首字符+****+尾字符+@+首字符+****+尾字符）
     * @param email 需要隐藏的邮箱地址
     * @returns 
     */
    convertEmail(email: string): string {
        const atIndex = email.indexOf('@'); // 获取邮箱中 @ 符号的索引位置
        const firstChar = email.charAt(0); // 获取邮箱的首字符
        const lastChar = email.charAt(atIndex - 1);
        const firstChar2 = email.charAt(atIndex + 1);
        const lastChar2 = email.charAt(email.length - 1);
        const convertedEmail = `${firstChar}****${lastChar}@${firstChar2}****${lastChar2}`; // 拼接转换后的邮箱字符串
        return convertedEmail;
    }

    /**寻找子物体 */
    findChild(parent: cc.Node, name: string) {
        parent.getChildByName(name);
    }

}
