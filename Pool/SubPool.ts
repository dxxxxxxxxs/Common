// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class SubPool {
    public get poolName() { return this.myPrefab.name; }
    private nodeArray: cc.Node[] = [];
    private myPrefab: cc.Prefab = null;
    constructor(prefab: cc.Prefab,) {
        this.myPrefab = prefab;
    }
    init() {
        //this.myPrefab = await BundleManager.load<cc.Prefab>(this.poolName,"ObjectPool");
    }
    public Spawn(parent: cc.Node): cc.Node {
        let go: cc.Node = null;
        this.nodeArray.forEach(node => {
            if (!node.active) {
                go = node;
                go.setParent(parent);
            }
        })
        if (go == null) {
            go = cc.instantiate(this.myPrefab);
            go.setParent(parent);
            this.nodeArray.push(go);
        }
        go.active = true;
        go.emit("OnSpawn");
        return go;
    }
    public UnSpawn(node: cc.Node) {
        if (this.Contains(node)) {
            node.emit("UnSpawn");
            node.removeFromParent();
            node.active = false;
        }
    }
    public UnSpawnAll() {
        this.nodeArray.forEach((node) => {
            if (node.active) {
                this.UnSpawn(node);
            }
        })
    }
    public Contains(node: cc.Node): boolean {
        return this.nodeArray.indexOf(node) > -1;
    }
}
