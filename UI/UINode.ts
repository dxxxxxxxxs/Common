export class UINode {
    private cacheChildren: Map<string, UINode>;

    constructor(private ccNode: cc.Node) {
        this.cacheChildren = new Map<string, UINode>();
    }

    child(path: string, cache = true): UINode {
        if (this.cacheChildren.has(path)) {
            return this.cacheChildren.get(path);
        } else {
            let ccn = this.ccNode.getChildByName(path);
            if (ccn == null) {
                return null;
            } else {
                let n = new UINode(ccn);
                if (cache === true) {
                    this.cacheChildren.set(path, n);
                }
                return n;
            }
        }
    }

    get node(): cc.Node {
        return this.ccNode;
    }

    get sprite(): cc.Sprite {
        return this.ccNode.getComponent(cc.Sprite);
    }

    get button(): cc.Button {
        return this.ccNode.getComponent(cc.Button);
    }

    get layout(): cc.Layout {
        return this.ccNode.getComponent(cc.Layout);
    }

    get label(): cc.Label {
        return this.ccNode.getComponent(cc.Label);
    }

    get editBox(): cc.EditBox {
        return this.ccNode.getComponent(cc.EditBox);
    }
}

