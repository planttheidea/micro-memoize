'use strict';

function cloneKey(args) {
    var key = [];
    for (var index = 0, length_1 = args.length; index < length_1; ++index) {
        key[index] = args[index];
    }
    return key;
}
function getDefault(type, value, defaultValue) {
    return typeof value === type ? value : defaultValue;
}
function getEntry(node) {
    return { key: node.k, value: node.v };
}
function sameValueZero(a, b) {
    return a === b || (a !== a && b !== b);
}
var Cache = /** @class */ (function () {
    function Cache(options) {
        this.h = null;
        this.s = 0;
        this.t = null;
        var transformKey = getDefault('function', options.transformKey);
        this.a = getDefault('function', options.matchesArg, sameValueZero);
        this.l = getDefault('number', options.maxSize, 1);
        this.m = getDefault('function', options.matchesKey, this.e);
        this.o = getDefault('function', options.onCache);
        this.p = getDefault('boolean', options.async, false);
        this.c = !!transformKey || options.matchesKey === this.m;
        this.k = this.c
            ? transformKey
                ? function (args) { return transformKey(cloneKey(args)); }
                : cloneKey
            : undefined;
    }
    Cache.prototype.clear = function () {
        this.h = this.t = null;
    };
    Cache.prototype.delete = function (node) {
        var next = node.n;
        var prev = node.p;
        if (next) {
            next.p = prev;
        }
        else {
            this.t = prev;
        }
        if (prev) {
            prev.n = next;
        }
        else {
            this.h = next;
        }
        --this.s;
        this.o && this.o('delete', getEntry(node), this);
    };
    Cache.prototype.has = function (key) {
        return !!this.g(key);
    };
    Cache.prototype.set = function (key, value) {
        var existingNode = this.g(key);
        if (!existingNode) {
            var node = this.n(key, value);
            this.o && this.o('add', getEntry(node), this);
            return node;
        }
        if (existingNode === this.h) {
            existingNode.v = value;
        }
        else {
            this.u(existingNode);
        }
        this.o && this.o('update', getEntry(existingNode), this);
        return existingNode;
    };
    Cache.prototype.snapshot = function () {
        var cached = [];
        var node = this.h;
        while (node != null) {
            cached.push(getEntry(node));
            node = node.n;
        }
        return cached;
    };
    Cache.prototype.e = function (prevKey, nextKey) {
        var length = nextKey.length;
        if (prevKey.length !== length) {
            return false;
        }
        if (length === 1) {
            return this.a(prevKey[0], nextKey[0]);
        }
        for (var index = 0; index < length; ++index) {
            if (!this.a(prevKey[index], nextKey[index])) {
                return false;
            }
        }
        return true;
    };
    Cache.prototype.f = function (key) {
        if (!this.h) {
            return;
        }
        if (this.m(this.h.k, key)) {
            this.o && this.o('hit', getEntry(this.h), this);
            return this.h;
        }
        if (this.h === this.t) {
            return;
        }
        var cached = this.h.n;
        while (cached) {
            if (this.m(cached.k, key)) {
                this.u(cached);
                this.o && this.o('update', getEntry(cached), this);
                return cached;
            }
            cached = cached.n;
        }
    };
    Cache.prototype.g = function (key) {
        var cached = this.h;
        while (cached) {
            if (this.m(cached.k, key)) {
                return cached;
            }
            cached = cached.n;
        }
    };
    Cache.prototype.n = function (key, value) {
        var prevHead = this.h;
        var prevTail = this.t;
        var node = { k: key, n: prevHead, p: null, v: value };
        this.h = node;
        if (prevHead) {
            prevHead.p = node;
        }
        else {
            this.t = node;
        }
        if (++this.s > this.l && prevTail) {
            this.delete(prevTail);
        }
        return node;
    };
    Cache.prototype.u = function (node) {
        var next = node.n;
        var prev = node.p;
        if (next) {
            next.p = prev;
        }
        if (prev) {
            prev.n = next;
        }
        this.h.p = node;
        node.n = this.h;
        node.p = null;
        this.h = node;
        if (node === this.t) {
            this.t = prev;
        }
    };
    return Cache;
}());
function memoize(fn, passedOptions) {
    if (passedOptions === void 0) { passedOptions = {}; }
    var cache = new Cache(passedOptions);
    // @ts-expect-error - Capture internal properties not surfaced on public API
    var transformKey = cache.k, onChange = cache.o;
    var memoized = function memoized() {
        var args = arguments;
        var key = transformKey ? transformKey(args) : args;
        // @ts-expect-error - `f` is not surfaced on public API
        var cached = cache.f(key);
        if (cached) {
            return cached.v;
        }
        // @ts-expect-error - `n` is not surfaced on public API
        cached = cache.n(transformKey ? key : cloneKey(key), fn.apply(this, key));
        onChange && onChange('add', getEntry(cached), cache);
        // @ts-expect-error - `p` is not surfaced on public API
        if (cache.p) {
            cached.v = cached.v.then(function (value) {
                onChange && onChange('resolved', getEntry(cached), cache);
                return value;
            }, function (error) {
                cache.delete(cached);
                throw error;
            });
        }
        return cached.v;
    };
    memoized.cache = cache;
    memoized.fn = fn;
    memoized.isMemoized = true;
    memoized.options = passedOptions;
    return memoized;
}

module.exports = memoize;
//# sourceMappingURL=micro-memoize.cjs.js.map
