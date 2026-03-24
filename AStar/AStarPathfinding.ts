/**
 * A* 寻路算法 - TypeScript 实现（含性能优化）
 * 适用于网格（Grid）地图的经典最短路径搜索
 *
 * 优化点简述：
 * 1. 开放列表用最小堆替代数组+sort，取最小节点 O(log n) 而非 O(n log n)
 * 2. 坐标用 number 做 key (y*width+x)，避免字符串拼接与 Map 查找开销
 * 3. 路径回溯用 push + reverse 替代多次 unshift，避免 O(pathLen²) 位移
 * 4. GC 优化：节点对象池、复用堆/Map/Set、邻居写缓冲区，减少 findPath 内短生命周期对象
 */

/** 二维坐标点 */
export interface Point {
    x: number;
    y: number;
}

/** 网格节点，用于 A* 算法 */
export interface AStarNode {
    /** 网格 x 坐标 */
    x: number;
    /** 网格 y 坐标 */
    y: number;
    /** 从起点到当前点的实际代价（已走距离） */
    g: number;
    /** 从当前点到终点的启发式估计代价 */
    h: number;
    /** f = g + h，总估计代价，用于优先队列排序 */
    f: number;
    /** 父节点，用于回溯路径 */
    parent: AStarNode | null;
    /** 是否可通行 */
    walkable: boolean;
}

/** 一个方向：相对当前格的位移 (dx, dy)，例如 (1,0) 表示向右一格 */
export type Direction = { dx: number; dy: number };

/** 常用方向预设，可直接传入 config.directions 或在其基础上增减 */
export const Directions = {
    /** 四方向：上、右、下、左 */
    four(): Direction[] {
        return [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
    },
    /** 八方向：四向 + 四个斜向 */
    eight(): Direction[] {
        return [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
            { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
        ];
    },
} as const;

/** 寻路配置 */
export interface AStarConfig {
    /** 地图宽度（列数） */
    width: number;
    /** 地图高度（行数） */
    height: number;
    /** 障碍物坐标集合，如 [[1,2], [3,4]] 表示 (1,2) 和 (3,4) 不可走 */
    obstacles?: Point[];
    /**
     * 是否允许对角线移动，默认 false（仅上下左右）。
     * 仅当未传入 directions 时生效；传入 directions 后本项被忽略。
     */
    allowDiagonal?: boolean;
    /**
     * 自定义方向集合，支持任意数量方向。
     * 例如四方向: [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}]
     * 八方向可在上述基础上加四个斜向。
     * 不传则使用 allowDiagonal 决定 4 或 8 方向。
     */
    directions?: Direction[];
    /**
     * 与 directions 一一对应的每步代价，长度需等于 directions.length。
     * 不传则根据位移自动计算：直线 1，斜线 √2；自定义方向用欧几里得距离。
     */
    directionCosts?: number[];
}

/** 最小堆：按 node.f 排序，用类封装替代闭包，便于维护与扩展 */
class MinHeap {
    private heap: AStarNode[] = [];

    push(n: AStarNode): void {
        const heap = this.heap;
        heap.push(n);
        let i = heap.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (heap[p].f <= heap[i].f) break;
            heap[i] = heap[p];
            heap[p] = n;
            i = p;
        }
    }

    /**这里一开始就已经取到最小值top了，因为heap本身就一定是一个最小堆，后面做的循环只是为了重新排序整个堆 */
    pop(): AStarNode | undefined {
        const heap = this.heap;
        if (heap.length === 0) return undefined;
        const top = heap[0];
        const last = heap.pop()!;
        if (heap.length === 0) return top;
        heap[0] = last;
        let i = 0;
        const n = heap.length;
        while (true) {
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            let smallest = i;
            if (l < n && heap[l].f < heap[smallest].f) smallest = l;
            if (r < n && heap[r].f < heap[smallest].f) smallest = r;
            if (smallest === i) break;
            const t = heap[i];
            heap[i] = heap[smallest];
            heap[smallest] = t;
            i = smallest;
        }
        return top;
    }

    size(): number {
        return this.heap.length;
    }

    clear(): void {
        this.heap.length = 0;
    }
}

/**
 * A* 寻路算法类
 */
/** 方向增量：四方向 + 可选四斜向，避免每次 getNeighbors 分配 */
const NEIGHBOR_OFFSETS_4 = [0, -1, 1, 0, 0, 1, -1, 0] as const; // [dx,dy, dx,dy, ...]
const NEIGHBOR_OFFSETS_8 = [0, -1, 1, 0, 0, 1, -1, 0, 1, -1, 1, 1, -1, 1, -1, -1] as const;

export class AStarPathfinding {
    private width: number;
    private height: number;
    /** 未使用自定义方向时：false=四方向，true=八方向 */
    private allowDiagonal: boolean;
    /** 是否使用外部传入的 directions；为 true 时 ignore allowDiagonal */
    private _useCustomDirections: boolean;
    /** 自定义方向扁平数组 [dx0,dy0, dx1,dy1, ...]，仅当 _useCustomDirections 时有效 */
    private _dirs: number[] = [];
    /** 自定义方向数量 */
    private _dirCount: number = 0;
    /** 与 _dirs 对应的每步代价，可选；无则按位移用 hypot 计算 */
    private _dirCosts: number[] | null = null;
    /** 障碍物集合，key = y*width+x */
    private obstacleSet: Set<number>;
    /** 节点对象池，findPath 结束时回收当次创建的所有节点，减少 GC */
    private _nodePool: AStarNode[] = [];
    /** 本次 findPath 内创建的节点，用于结束时统一回收到池 */
    private _allocatedNodes: AStarNode[] = [];
    /** 复用：开放列表堆，避免每次 new */
    private _openHeap = new MinHeap();
    /** 复用：开放列表 Map */
    private _openMap = new Map<number, AStarNode>();
    /** 复用：闭表 */
    private _closedSet = new Set<number>();
    /** 邻居坐标缓冲区 [x0,y0, x1,y1, ...]，避免 getNeighbors 内分配 Point[] */
    private _neighborBuf: number[] = [];

    constructor(config: AStarConfig) {
        this.width = config.width;
        this.height = config.height;
        this.allowDiagonal = config.allowDiagonal ?? false;
        this.obstacleSet = new Set();
        if (config.obstacles) {
            for (const p of config.obstacles) {
                this.obstacleSet.add(this._keyNum(p.x, p.y));
            }
        }
        if (config.directions && config.directions.length > 0) {
            this._useCustomDirections = true;
            this._dirCount = config.directions.length;
            this._dirs = [];
            for (const d of config.directions) {
                this._dirs.push(d.dx, d.dy);
            }
            if (config.directionCosts && config.directionCosts.length === this._dirCount) {
                this._dirCosts = config.directionCosts.slice();
            } else {
                this._dirCosts = null;
            }
        } else {
            this._useCustomDirections = false;
            this._dirCount = 0;
            this._dirs = [];
            this._dirCosts = null;
        }
    }

    /** 从池中取或新建节点，并记录到 _allocatedNodes 便于结束时回收 */
    private _getNode(x: number, y: number, g: number, h: number, parent: AStarNode | null): AStarNode {
        const f = g + h;
        let node = this._nodePool.pop();
        if (node) {
            node.x = x;
            node.y = y;
            node.g = g;
            node.h = h;
            node.f = f;
            node.parent = parent;
            node.walkable = true;
        } else {
            node = {
                x, y, g, h, f,
                parent,
                walkable: true,
            };
        }
        this._allocatedNodes.push(node);
        return node;
    }

    /** 回收本次 findPath 中创建的所有节点到池 */
    private _recycleNodes(): void {
        for (let i = 0; i < this._allocatedNodes.length; i++) {
            this._nodePool.push(this._allocatedNodes[i]);
        }
        this._allocatedNodes.length = 0;
    }

    /** 数字 key：y*width+x，用于 Map/Set 查找与闭表，避免字符串拼接 */
    private _keyNum(x: number, y: number): number {
        return y * this.width + x;
    }

    /** 判断 (x, y) 是否在范围内且可通行 */
    isWalkable(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return !this.obstacleSet.has(this._keyNum(x, y));
    }

    /** 动态添加障碍物 */
    addObstacle(x: number, y: number): void {
        this.obstacleSet.add(this._keyNum(x, y));
    }

    /** 动态移除障碍物 */
    removeObstacle(x: number, y: number): void {
        this.obstacleSet.delete(this._keyNum(x, y));
    }

    /**
     * 启发函数：自定义方向用欧几里得距离（可采纳）；内置 4/8 用曼哈顿/切比雪夫
     */
    private heuristic(x1: number, y1: number, x2: number, y2: number): number {
        if (this._useCustomDirections) {
            return Math.hypot(x2 - x1, y2 - y1);
        }
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        if (this.allowDiagonal) {
            return Math.max(dx, dy);
        }
        return dx + dy;
    }

    /** 将当前节点的可通行邻居写入 _neighborBuf [x0,y0,x1,y1,...]，返回邻居数量（零分配） */
    private getNeighborCount(node: AStarNode): number {
        let len = 0;
        if (this._useCustomDirections) {
            for (let i = 0; i < this._dirCount; i++) {
                const nx = node.x + this._dirs[i * 2];
                const ny = node.y + this._dirs[i * 2 + 1];
                if (this.isWalkable(nx, ny)) {
                    if (this._neighborBuf.length <= len * 2) this._neighborBuf.push(0, 0);
                    this._neighborBuf[len * 2] = nx;
                    this._neighborBuf[len * 2 + 1] = ny;
                    len++;
                }
            }
        } else {
            const offsets = this.allowDiagonal ? NEIGHBOR_OFFSETS_8 : NEIGHBOR_OFFSETS_4;
            const step = this.allowDiagonal ? 8 : 4;
            for (let i = 0; i < step; i++) {
                const nx = node.x + offsets[i * 2];
                const ny = node.y + offsets[i * 2 + 1];
                if (this.isWalkable(nx, ny)) {
                    if (this._neighborBuf.length <= len * 2) this._neighborBuf.push(0, 0);
                    this._neighborBuf[len * 2] = nx;
                    this._neighborBuf[len * 2 + 1] = ny;
                    len++;
                }
            }
        }
        return len;
    }

    /**
     * 计算从当前节点到 (nx, ny) 的一步代价。
     * 自定义方向：有 directionCosts 则查表，否则用 hypot(dx,dy)；内置 4/8：直线 1，斜线 √2
     */
    private moveCost(from: AStarNode, nx: number, ny: number): number {
        const dx = nx - from.x;
        const dy = ny - from.y;
        if (this._useCustomDirections) {
            if (this._dirCosts) {
                for (let i = 0; i < this._dirCount; i++) {
                    if (this._dirs[i * 2] === dx && this._dirs[i * 2 + 1] === dy) {
                        return this._dirCosts![i];
                    }
                }
            }
            return Math.hypot(dx, dy);
        }
        return (Math.abs(dx) + Math.abs(dy)) === 2 ? 1.414 : 1;
    }

    /**
     * 核心：A* 寻路（低 GC：复用堆/Map/Set、节点池、邻居缓冲区）
     * @param start 起点
     * @param end 终点
     * @returns 路径点数组 [start, ..., end]，若不可达则返回 []
     */
    findPath(start: Point, end: Point): Point[] {
        if (!this.isWalkable(start.x, start.y) || !this.isWalkable(end.x, end.y)) {
            return [];
        }
        if (start.x === end.x && start.y === end.y) {
            return [{ x: start.x, y: start.y }];
        }

        this._allocatedNodes.length = 0;
        this._openHeap.clear();
        this._openMap.clear();
        this._closedSet.clear();

        const startH = this.heuristic(start.x, start.y, end.x, end.y);
        const startNode = this._getNode(start.x, start.y, 0, startH, null);

        this._openHeap.push(startNode);
        this._openMap.set(this._keyNum(start.x, start.y), startNode);

        while (this._openHeap.size() > 0) {
            const current = this._openHeap.pop()!;//取到最小值top
            const ck = this._keyNum(current.x, current.y);
            if (this._closedSet.has(ck)) continue;
            this._closedSet.add(ck);
            this._openMap.delete(ck);

            if (current.x === end.x && current.y === end.y) {
                const path = this._buildPath(current);
                this._recycleNodes();
                return path;
            }

            const nCount = this.getNeighborCount(current);
            for (let i = 0; i < nCount; i++) {
                const nx = this._neighborBuf[i * 2];
                const ny = this._neighborBuf[i * 2 + 1];
                const nk = this._keyNum(nx, ny);
                if (this._closedSet.has(nk)) continue;

                const moveCost = this.moveCost(current, nx, ny);//1
                const gNew = current.g + moveCost;
                const hNew = this.heuristic(nx, ny, end.x, end.y);
                const fNew = gNew + hNew;

                const existing = this._openMap.get(nk);
                if (existing) {
                    if (gNew < existing.g) {
                        existing.g = gNew;
                        existing.f = fNew;
                        existing.parent = current;
                        this._openHeap.push(existing);
                    }
                } else {
                    const newNode = this._getNode(nx, ny, gNew, hNew, current);
                    newNode.f = fNew;
                    this._openHeap.push(newNode);
                    this._openMap.set(nk, newNode);
                }
            }
        }
        this._recycleNodes();
        return [];
    }

    /** 从终点回溯路径：先 push 再 reverse，避免多次 unshift 导致 O(n²) */
    private _buildPath(node: AStarNode): Point[] {
        const path: Point[] = [];
        let cur: AStarNode | null = node;
        while (cur) {
            path.push({ x: cur.x, y: cur.y });
            cur = cur.parent;
        }
        path.reverse();
        return path;
    }
}

// ============ 使用示例 ============
// ============ 进一步可优化方向（按需实现）============
// · 闭表用 TypedArray（Uint8Array[width*height]）标记是否已访问，比 Set<number> 更省内存
// · 路径若允许返回 number[]（交错 x,y）可避免 path 上每个点的 {x,y} 分配，由调用方再转

/*
// 方式一：沿用 4/8 方向（allowDiagonal）
const astar = new AStarPathfinding({
    width: 10, height: 10,
    obstacles: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
    allowDiagonal: false,
});

// 方式二：自定义方向（任意数量）
const astar2 = new AStarPathfinding({
    width: 10, height: 10,
    directions: Directions.eight(),  // 或 Directions.four()，或自建 [{dx,dy}, ...]
    directionCosts: [1,1,1,1, 1.414,1.414,1.414,1.414], // 可选，与 directions 一一对应
});

const path = astar.findPath({ x: 0, y: 0 }, { x: 5, y: 5 });
*/
