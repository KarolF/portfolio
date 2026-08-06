(function (global) {
    "use strict";

    var STORAGE_KEY = "SPRINT_NA_1000_LOCAL_LEADERBOARD_V1";
    var listeners = [];
    var databaseInstance = null;

    function asyncCall(fn) {
        if (typeof queueMicrotask === "function") {
            queueMicrotask(fn);
        } else {
            setTimeout(fn, 0);
        }
    }

    function clone(value) {
        if (value === undefined) {
            return null;
        }
        return JSON.parse(JSON.stringify(value));
    }

    function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function normalisePath(path) {
        path = String(path || "");
        try {
            if (/^[a-z]+:\/\//i.test(path)) {
                path = new URL(path, global.location && global.location.href || undefined).pathname;
            }
        } catch (_) {
            path = "/";
        }

        path = path.replace(/\\/g, "/").replace(/\/+/, "/");
        path = path.replace(/\/{2,}/g, "/");
        if (path.charAt(0) !== "/") {
            path = "/" + path;
        }
        if (path.length > 1 && path.charAt(path.length - 1) === "/") {
            path = path.slice(0, -1);
        }
        return path || "/";
    }

    function segments(path) {
        path = normalisePath(path);
        return path === "/" ? [] : path.slice(1).split("/").filter(Boolean);
    }

    function parentPath(path) {
        var parts = segments(path);
        parts.pop();
        return normalisePath(parts.join("/"));
    }

    function keyForPath(path) {
        var parts = segments(path);
        return parts.length ? parts[parts.length - 1] : null;
    }

    function loadState() {
        try {
            var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return { version: 1, data: {}, priorities: {} };
            }
            var parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== 1 || !isObject(parsed.data) || !isObject(parsed.priorities)) {
                throw new Error("Invalid local leaderboard data");
            }
            return parsed;
        } catch (error) {
            console.warn("Local leaderboard storage was reset:", error);
            return { version: 1, data: {}, priorities: {} };
        }
    }

    var state = loadState();

    function saveState() {
        if (!global.localStorage) {
            throw new Error("Local storage is unavailable");
        }
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function getAt(path) {
        var current = state.data;
        var parts = segments(path);
        for (var i = 0; i < parts.length; i++) {
            if (!isObject(current) || !Object.prototype.hasOwnProperty.call(current, parts[i])) {
                return null;
            }
            current = current[parts[i]];
        }
        return current === undefined ? null : clone(current);
    }

    function setAt(path, value) {
        var parts = segments(path);
        if (!parts.length) {
            state.data = isObject(value) ? value : {};
            return;
        }

        var current = state.data;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!isObject(current[parts[i]])) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        var last = parts[parts.length - 1];
        if (value === null) {
            delete current[last];
        } else {
            current[last] = value;
        }
    }

    function priorityAt(path) {
        var value = state.priorities[normalisePath(path)];
        return typeof value === "number" && isFinite(value) ? value : null;
    }

    function setPriority(path, priority) {
        path = normalisePath(path);
        if (typeof priority === "number" && isFinite(priority)) {
            state.priorities[path] = priority;
        } else {
            delete state.priorities[path];
        }
    }

    function resolveServerValues(value) {
        if (isObject(value) && value[".sv"] === "timestamp") {
            return Date.now();
        }
        if (Array.isArray(value)) {
            return value.map(resolveServerValues);
        }
        if (isObject(value)) {
            var result = {};
            Object.keys(value).forEach(function (key) {
                result[key] = resolveServerValues(value[key]);
            });
            return result;
        }
        return value;
    }

    function sanitiseLeaderboardRecord(path, value) {
        var parts = segments(path);
        if (parts.length === 2 && parts[0] === "Leaderboard" && isObject(value)) {
            return {
                name: String(value.name || "").slice(0, 120),
                score: Number.isFinite(Number(value.score)) ? Number(value.score) : 0,
                extra: null,
                updateAt: typeof value.updateAt === "number" ? value.updateAt : Date.now()
            };
        }
        return value;
    }

    function compareChildren(parent, a, b) {
        var pa = priorityAt(normalisePath(parent + "/" + a));
        var pb = priorityAt(normalisePath(parent + "/" + b));
        if (pa === null && pb !== null) return 1;
        if (pa !== null && pb === null) return -1;
        if (pa !== pb) return pa < pb ? -1 : 1;
        return a < b ? -1 : (a > b ? 1 : 0);
    }

    function orderedChildKeys(path) {
        var value = getAt(path);
        if (!isObject(value)) return [];
        return Object.keys(value).sort(function (a, b) {
            return compareChildren(path, a, b);
        });
    }

    function previousChildKey(path) {
        var parent = parentPath(path);
        var key = keyForPath(path);
        var keys = orderedChildKeys(parent);
        var index = keys.indexOf(key);
        return index > 0 ? keys[index - 1] : null;
    }

    function Snapshot(path, valueOverride) {
        this._path = normalisePath(path);
        this._hasOverride = arguments.length > 1;
        this._valueOverride = valueOverride;
        this.key = keyForPath(this._path);
        this.ref = new Reference(this._path);
    }

    Snapshot.prototype.val = function () {
        return clone(this._hasOverride ? this._valueOverride : getAt(this._path));
    };

    Snapshot.prototype.exists = function () {
        return this.val() !== null;
    };

    Snapshot.prototype.forEach = function (callback) {
        var value = this.val();
        if (!isObject(value)) return false;
        var keys = orderedChildKeys(this._path);
        for (var i = 0; i < keys.length; i++) {
            if (callback(new Snapshot(normalisePath(this._path + "/" + keys[i]), value[keys[i]])) === true) {
                return true;
            }
        }
        return false;
    };

    function listenerMatches(listener, ref, event, callback) {
        return listener.path === ref._path &&
            (!event || listener.event === event) &&
            (!callback || listener.callback === callback);
    }

    function dispatchValueForPath(path) {
        listeners.slice().forEach(function (listener) {
            if (listener.event === "value" && listener.path === path) {
                asyncCall(function () {
                    listener.callback(new Snapshot(path));
                });
            }
        });
    }

    function dispatchAncestorValues(path) {
        var current = normalisePath(path);
        while (true) {
            dispatchValueForPath(current);
            if (current === "/") break;
            current = parentPath(current);
        }
    }

    function dispatchChildEvent(parent, event, childPath) {
        var previous = previousChildKey(childPath);
        listeners.slice().forEach(function (listener) {
            if (listener.event === event && listener.path === parent) {
                asyncCall(function () {
                    listener.callback(new Snapshot(childPath), previous);
                });
            }
        });
    }

    function commit(path, value, priority, callback) {
        path = normalisePath(path);
        var existed = getAt(path) !== null;
        var oldPriority = priorityAt(path);
        var resolved = sanitiseLeaderboardRecord(path, resolveServerValues(clone(value)));

        try {
            setAt(path, resolved);
            setPriority(path, priority);
            saveState();

            dispatchAncestorValues(path);
            var parent = parentPath(path);
            if (path !== "/") {
                dispatchChildEvent(parent, existed ? "child_changed" : "child_added", path);
                if (existed && oldPriority !== priorityAt(path)) {
                    dispatchChildEvent(parent, "child_moved", path);
                }
            }

            asyncCall(function () {
                if (callback) callback(null);
            });
        } catch (error) {
            asyncCall(function () {
                if (callback) callback(error);
            });
        }
    }

    function Reference(path) {
        this._path = normalisePath(path);
        this.key = keyForPath(this._path);
    }

    Reference.prototype.toString = function () {
        return "local://database" + this._path;
    };

    Reference.prototype.child = function (childPath) {
        return new Reference(normalisePath(this._path + "/" + String(childPath || "")));
    };

    Reference.prototype.setWithPriority = function (value, priority, callback) {
        commit(this._path, value, priority, callback);
    };

    Reference.prototype.set = function (value, callback) {
        commit(this._path, value, priorityAt(this._path), callback);
    };

    Reference.prototype.remove = function (callback) {
        commit(this._path, null, null, callback);
    };

    Reference.prototype.once = function (event, success, failure) {
        var self = this;
        return new Promise(function (resolve, reject) {
            asyncCall(function () {
                try {
                    if (event !== "value") {
                        throw new Error("Unsupported local database event: " + event);
                    }
                    var snapshot = new Snapshot(self._path);
                    if (success) success(snapshot);
                    resolve(snapshot);
                } catch (error) {
                    if (failure) failure(error);
                    reject(error);
                }
            });
        });
    };

    Reference.prototype.on = function (event, callback, cancelCallback) {
        var entry = { path: this._path, event: event, callback: callback };
        listeners.push(entry);
        var self = this;
        var initialValue = event === "value" ? getAt(self._path) : null;
        var initialKeys = event === "child_added" ? orderedChildKeys(self._path) : [];
        var initialChildren = {};
        initialKeys.forEach(function (key) {
            initialChildren[key] = getAt(normalisePath(self._path + "/" + key));
        });

        asyncCall(function () {
            try {
                if (event === "value") {
                    callback(new Snapshot(self._path, initialValue));
                } else if (event === "child_added") {
                    for (var i = 0; i < initialKeys.length; i++) {
                        var key = initialKeys[i];
                        callback(new Snapshot(normalisePath(self._path + "/" + key), initialChildren[key]), i ? initialKeys[i - 1] : null);
                    }
                }
            } catch (error) {
                if (cancelCallback) cancelCallback(error);
            }
        });

        return callback;
    };

    Reference.prototype.off = function (event, callback) {
        var self = this;
        listeners = listeners.filter(function (listener) {
            return !listenerMatches(listener, self, event, callback);
        });
    };

    Reference.prototype.transaction = function (updateFunction, completion) {
        var current = getAt(this._path);
        var next;
        try {
            next = updateFunction(clone(current));
        } catch (error) {
            asyncCall(function () {
                if (completion) completion(error, false, new Snapshot(this._path));
            }.bind(this));
            return;
        }

        var value = next;
        var priority = priorityAt(this._path);
        if (isObject(next) && Object.prototype.hasOwnProperty.call(next, ".value")) {
            value = next[".value"];
            priority = next[".priority"];
        }

        var self = this;
        commit(this._path, value, priority, function (error) {
            if (completion) completion(error, !error, new Snapshot(self._path));
        });
    };

    function Database() {}

    Database.prototype.ref = function (path) {
        return new Reference(path);
    };

    Database.prototype.refFromURL = function (url) {
        return new Reference(url);
    };

    function database() {
        if (!databaseInstance) databaseInstance = new Database();
        return databaseInstance;
    }

    database.enableLogging = function () {};
    database.ServerValue = {
        ".sv": "timestamp",
        TIMESTAMP: { ".sv": "timestamp" }
    };

    function installExternalNetworkGuard() {
        function isExternal(url) {
            try {
                var parsed = new URL(url, global.location.href);
                return parsed.origin !== global.location.origin;
            } catch (_) {
                return true;
            }
        }

        if (typeof global.fetch === "function") {
            var originalFetch = global.fetch.bind(global);
            global.fetch = function (input, init) {
                var url = typeof input === "string" ? input : input && input.url;
                if (isExternal(url)) return Promise.reject(new TypeError("External network access is disabled"));
                return originalFetch(input, init);
            };
        }

        if (global.XMLHttpRequest && global.XMLHttpRequest.prototype) {
            var originalOpen = global.XMLHttpRequest.prototype.open;
            global.XMLHttpRequest.prototype.open = function (method, url) {
                if (isExternal(url)) throw new DOMException("External network access is disabled", "SecurityError");
                return originalOpen.apply(this, arguments);
            };
        }

        if (global.navigator && typeof global.navigator.sendBeacon === "function") {
            var originalBeacon = global.navigator.sendBeacon.bind(global.navigator);
            global.navigator.sendBeacon = function (url, data) {
                if (isExternal(url)) return false;
                return originalBeacon(url, data);
            };
        }
    }

    installExternalNetworkGuard();

    global.firebase = {
        apps: [],
        initializeApp: function (config) {
            var app = { name: "[DEFAULT]", options: clone(config || {}) };
            this.apps = [app];
            return app;
        },
        database: database
    };
})(window);
