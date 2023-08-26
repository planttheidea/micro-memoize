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
function updateAsyncEntry(cache, entry) {
    entry.value = entry.value.then(function (value) {
        if (cache.onChange) {
            var index = cache.entries.indexOf(entry);
            if (index === 0) {
                cache.onChange('hit', entry, cache);
            }
            else if (index !== -1) {
                cache.onChange('update', entry, cache);
            }
        }
        return value;
    }, function (error) {
        cache.remove(entry);
        throw error;
    });
}
var Cache = /** @class */ (function () {
    function Cache(options) {
        this.entries = [];
        var transformKey = getDefault('function', options.transformKey);
        this.isPromise = getDefault('boolean', options.isPromise, false);
        this.matchesArg = getDefault('function', options.matchesArg, sameValueZero);
        this.matchesKey = getDefault('function', options.matchesKey, this.areKeysEqual);
        this.maxSize = getDefault('number', options.maxSize, 1);
        this.onChange = getDefault('function', options.onChange);
        this.shouldClone = !!transformKey || options.matchesKey === this.matchesKey;
        this.transformKey = this.shouldClone
            ? transformKey
                ? function (args) { return transformKey(cloneKey(args)); }
                : cloneKey
            : undefined;
    }
    Cache.prototype.add = function (args, value) {
        var key = cloneKey(args);
        var entry = { key: key, value: value };
        this.onChange && this.onChange('add', entry, this);
        this.reorder(entry, this.entries.length);
        return entry;
    };
    Cache.prototype.clear = function () {
        this.entries.length = 0;
    };
    Cache.prototype.match = function (key) {
        var length = this.entries.length;
        if (!length) {
            return;
        }
        var entry = this.entries[0];
        if (this.matchesKey(entry.key, key)) {
            this.onChange && this.onChange('hit', entry, this);
            return entry;
        }
        if (length === 1) {
            return;
        }
        for (var index = 1; index < length; ++index) {
            entry = this.entries[index];
            if (this.matchesKey(entry.key, key)) {
                this.reorder(entry, index);
                this.onChange && this.onChange('update', entry, this);
                return entry;
            }
        }
    };
    Cache.prototype.remove = function (entry) {
        var index = this.entries.indexOf(entry);
        if (index !== -1) {
            this.entries.splice(index, 1);
            this.onChange && this.onChange('remove', entry, this);
        }
    };
    Cache.prototype.snapshot = function () {
        return this.entries.map(function (_a) {
            var key = _a.key, value = _a.value;
            return ({ key: key, value: value });
        });
    };
    Cache.prototype.areKeysEqual = function (prevKey, nextKey) {
        var length = nextKey.length;
        if (prevKey.length !== length) {
            return false;
        }
        if (length === 1) {
            return this.matchesArg(prevKey[0], nextKey[0]);
        }
        for (var index = 0; index < length; ++index) {
            if (!this.matchesArg(prevKey[index], nextKey[index])) {
                return false;
            }
        }
        return true;
    };
    Cache.prototype.reorder = function (entry, startingIndex) {
        var currentLength = this.entries.length;
        var index = startingIndex;
        while (index--) {
            this.entries[index + 1] = this.entries[index];
        }
        this.entries[0] = entry;
        if (currentLength === this.maxSize && startingIndex === currentLength) {
            this.entries.pop();
        }
        else if (startingIndex >= this.maxSize) {
            // eslint-disable-next-line no-multi-assign
            this.entries.length = this.maxSize;
        }
    };
    return Cache;
}());
function sameValueZero(a, b) {
    return a === b || (a !== a && b !== b);
}
function memoize(fn, passedOptions) {
    if (passedOptions === void 0) { passedOptions = {}; }
    var cache = new Cache(passedOptions);
    var memoized = function memoized() {
        // console.group(`call - ${cloneKey(arguments)}`);
        var key = cache.transformKey
            ? // eslint-disable-next-line prefer-rest-params
                cache.transformKey(arguments)
            : // eslint-disable-next-line prefer-rest-params
                arguments;
        var cached = cache.match(key);
        if (cached) {
            //   console.groupEnd();
            return cached.value;
        }
        cached = cache.add(key, fn.apply(this, key));
        if (cache.isPromise) {
            updateAsyncEntry(cache, cached);
        }
        // console.groupEnd();
        return cached.value;
    };
    memoized.cache = cache;
    memoized.fn = fn;
    memoized.isMemoized = true;
    return memoized;
}

export { memoize as default };
//# sourceMappingURL=micro-memoize.esm.js.map
