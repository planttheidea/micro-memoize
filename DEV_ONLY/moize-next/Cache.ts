import { Cache as BaseCache, CacheEvent, CacheEventReason, CacheNode, Key, KeyTransformer } from '../../src';
import type { NormalizedOptions, Options, StatsProfile } from './internalTypes';
import { defaultArgumentSerializer, isSerializedKeyEqual } from './serialize';
import { clearStats, getStats } from './stats';
import { cloneKey, compose, getMaxArgsTransformKey } from './utils';

export interface ExpirationManager {
    a: boolean;
    c: () => void;
    e: () => void;
    i: ReturnType<typeof setTimeout> | null;
    s: () => void;
    t: number;
    u: (newExpiration?: number) => void;
}

const expiringNodes = new Map<CacheNode<any>, ExpirationManager>();

export class Cache<Fn extends (...args: any[]) => any> extends BaseCache<Fn> {
    pn: string;
    s: boolean = false;
    x?: number;
    xo?: Options<Fn>['onExpire'];
    xr?: Options<Fn>['rescheduleExpiration'];

    constructor(options: NormalizedOptions<Fn>) {
        super(options);

        this.pn = options.profileName;

        const { expiresAfter, maxArgs, serialize, transformKey } = options;

        const keyTransformers: KeyTransformer<Fn>[] = [];

        if (serialize) {
            if (!options.isKeyEqual) {
                this.m = isSerializedKeyEqual;
            }

            keyTransformers.push(
                typeof serialize === 'function' 
                    ? (args: IArguments | Key) => serialize(cloneKey<Fn>(args as Parameters<Fn>))
                    : defaultArgumentSerializer,
            );
        }

        if (transformKey) {
            keyTransformers.push(transformKey);
        }

        if (maxArgs && maxArgs >= 0) {
            keyTransformers.push(getMaxArgsTransformKey(maxArgs));
        }

        if (keyTransformers.length) {
            // @ts-expect-error - ignore for now
            this.k = compose(...keyTransformers);
        }

        if (typeof expiresAfter === 'number' && !isNaN(expiresAfter) && expiresAfter > 0 && expiresAfter < Infinity) {
            this.x = expiresAfter;
            this.xo = options.onExpire;
            this.xr = options.rescheduleExpiration;

            if (this.xr) {
                this.xu = this.xu.bind(this);
                
                this.on('hit', this.xu);
                this.on('update', this.xu);
            }

            this.clear = this.xc;
            this.d = this.xd;
            this.n = this.xn.bind(this, expiresAfter);
        }
    }

    clearStats(): void {
        clearStats(this.pn);
    }

    getStats(): StatsProfile {
        return getStats(this.pn);
    }

    keys(): Key[] {
        return this.entries().map((entry) => entry[0]);
    }

    values(): Array<ReturnType<Fn>> {
        return this.entries().map((entry) => entry[1]);
    }

    xc() {
        expiringNodes.forEach((expiringMananger) => {
            expiringMananger.c();
        });

        super.clear();
    }

    xd(node: CacheNode<Fn>): void {
        super.d(node);

        const expirationManager = expiringNodes.get(node);

        if (expirationManager) {
            expirationManager.c();
            expiringNodes.delete(node);
        }
    }

    xm(node: CacheNode<Fn>, expiration: number): ExpirationManager {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const cache = this;

        return {
            a: false,
            i: null,
            t: expiration,

            c() {
                if (this.i) {
                    clearTimeout(this.i);
                    this.i = null;
                }
            },

            e() {
                if (!this.a) {
                    return;
                }

                this.c();
                expiringNodes.delete(node);

                this.a = false;
                
                if (cache.xo) {
                    const result = cache.xo([node.k, node.v]);
    
                    if (result === false) {
                        return;
                    }
                }
    
                cache.d(node);
                cache.od && cache.od.n(node, 'expired' as unknown as CacheEventReason);
            },
        
            s() {
                this.a = true;
                
                expiringNodes.set(node, this);
        
                this.i = setTimeout(() => {
                    this.e();
                    this.i = null;
                }, this.t);
            },
        
            u(this: ExpirationManager, newExpiration: number = this.t) {
                this.a && this.c();
        
                this.t = newExpiration;
                this.s();
            }

        }
    }

    xn(expiration: number, key: Key, value: any) {
        const node = super.n(key, value);

        const expirationManager = this.xm(node, expiration);

        expiringNodes.set(node, expirationManager);
        expirationManager.s();

        return node;
    }

    xu(event: CacheEvent<'hit' | 'update', Fn>): void {
        if (typeof this.xr === 'function' && !this.xr(event)) {
            return;
        }

        const key = event.entry[0];
        const node = this.g(key);
        const expirationManager = node && expiringNodes.get(node);

        if (!expirationManager) {
            return;
        }

        expirationManager.u();
    }
}